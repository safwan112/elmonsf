<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\PublishStatus;
use App\Exceptions\DomainException;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\Question;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ExamController extends Controller
{
    use AdminCrud;

    public function index(): JsonResponse
    {
        $exams = Exam::query()
            ->with(['course:id,title', 'product:id,title'])
            ->withCount('attempts')
            ->orderBy('sort_order')->orderByDesc('id')
            ->get();

        return response()->json(['data' => $exams->map(fn (Exam $e) => $this->present($e))->values()]);
    }

    public function show(Exam $exam): JsonResponse
    {
        $exam->load(['course:id,title', 'product:id,title', 'questions.options'])->loadCount('attempts');

        return response()->json(['data' => [
            ...$this->present($exam),
            'questions' => $exam->questions->map(fn (Question $q) => [
                'id' => $q->id,
                'body' => $q->body,
                'topic' => $q->topic,
                'difficulty' => ['value' => $q->difficulty->value, 'label' => $q->difficulty->label()],
                'points' => (int) $q->pivot->points,
                'is_active' => $q->is_active,
            ])->values(),
        ]]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $data['status'] ??= PublishStatus::Draft->value;
        if ($data['status'] === PublishStatus::Published->value && empty($data['published_at'])) {
            $data['published_at'] = now();
        }

        $exam = Exam::query()->create($data)->refresh();
        $this->audit('exam.created', $exam);

        return response()->json(['data' => $this->present($exam->load(['course:id,title', 'product:id,title'])->loadCount('attempts'))], 201);
    }

    public function update(Request $request, Exam $exam): JsonResponse
    {
        $data = $this->validated($request, true);
        if (($data['status'] ?? null) === PublishStatus::Published->value && empty($data['published_at']) && ! $exam->published_at) {
            $data['published_at'] = now();
        }

        $exam->update($data);
        $this->audit('exam.updated', $exam, ['fields' => array_keys($data)]);

        return response()->json(['data' => $this->present($exam->load(['course:id,title', 'product:id,title'])->loadCount('attempts'))]);
    }

    public function destroy(Exam $exam): JsonResponse
    {
        if ($exam->attempts()->exists()) {
            $exam->update(['status' => PublishStatus::Archived]);
            $this->audit('exam.archived', $exam);

            return response()->json(['message' => __('admin.deactivated')]);
        }

        $exam->delete();
        $this->audit('exam.deleted', $exam, ['title' => $exam->title]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    /**
     * Replace the exam's questions (ordered) and points. Attempts freeze
     * their own layout, but changing a live exam would make results
     * incomparable, so exams with attempts are locked.
     */
    public function syncQuestions(Request $request, Exam $exam): JsonResponse
    {
        if (ExamAttempt::query()->where('exam_id', $exam->id)->exists()) {
            throw new DomainException(__('admin.exam_has_attempts'), 'exam_has_attempts', 409);
        }

        $data = $request->validate([
            'questions' => ['present', 'array', 'max:200'],
            'questions.*.id' => ['required', 'integer', 'distinct', 'exists:questions,id'],
            'questions.*.points' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        DB::transaction(function () use ($exam, $data) {
            $exam->questions()->sync(
                collect($data['questions'])->values()->mapWithKeys(fn ($q, $i) => [
                    (int) $q['id'] => ['points' => (int) ($q['points'] ?? 1), 'sort_order' => $i],
                ])->all()
            );
            $exam->refreshQuestionsCount();
        });
        $this->audit('exam.questions_updated', $exam, ['count' => count($data['questions'])]);

        return $this->show($exam->refresh());
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'course_id' => ['sometimes', 'nullable', 'integer', 'exists:courses,id'],
            'product_id' => ['sometimes', 'nullable', 'integer', 'exists:products,id'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id'],
            'duration_minutes' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:600'],
            'pass_percent' => ['sometimes', 'integer', 'min:0', 'max:100'],
            'max_attempts' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
            'shuffle_questions' => ['sometimes', 'boolean'],
            'shuffle_options' => ['sometimes', 'boolean'],
            'show_answers' => ['sometimes', 'boolean'],
            'status' => ['sometimes', Rule::enum(PublishStatus::class)],
            'published_at' => ['sometimes', 'nullable', 'date'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
        ]);
    }

    /** @return array<string, mixed> */
    private function present(Exam $e): array
    {
        return [
            'id' => $e->id,
            'title' => $e->title,
            'description' => $e->description,
            'course_id' => $e->course_id,
            'product_id' => $e->product_id,
            'category_id' => $e->category_id,
            'course' => $e->course ? ['id' => $e->course->id, 'title' => $e->course->title] : null,
            'product' => $e->product ? ['id' => $e->product->id, 'title' => $e->product->title] : null,
            'duration_minutes' => $e->duration_minutes,
            'pass_percent' => $e->pass_percent,
            'max_attempts' => $e->max_attempts,
            'shuffle_questions' => $e->shuffle_questions,
            'shuffle_options' => $e->shuffle_options,
            'show_answers' => $e->show_answers,
            'status' => ['value' => $e->status->value, 'label' => $e->status->label()],
            'published_at' => $e->published_at?->toIso8601String(),
            'sort_order' => $e->sort_order,
            'questions_count' => $e->questions_count,
            'attempts_count' => $e->attempts_count ?? 0,
        ];
    }
}
