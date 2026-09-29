<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Enums\AttemptStatus;
use App\Http\Controllers\Api\V1\Learning\Concerns\GuardsLearningAccess;
use App\Http\Controllers\Controller;
use App\Http\Resources\Learning\AttemptResource;
use App\Models\Exam;
use App\Models\ExamAttempt;
use App\Models\User;
use App\Services\Learning\ExamService;
use App\Services\Learning\LearningAccess;
use App\Support\RichText;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class ExamController extends Controller
{
    use GuardsLearningAccess;

    public function __construct(
        private readonly LearningAccess $access,
        private readonly ExamService $exams,
    ) {}

    /**
     * Exams the student can take (free ones, and those of their courses
     * and purchased products), with their attempt stats.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate(['course_id' => ['nullable', 'integer']]);
        $user = $request->user();

        $query = Exam::query()->published()->with('course:id,title,slug')->orderBy('sort_order')->orderBy('id');
        if (! $user->isAdmin()) {
            $grants = $this->access->grants($user);
            $query->where(fn (Builder $q) => $q
                ->where(fn (Builder $free) => $free->whereNull('course_id')->whereNull('product_id'))
                ->orWhereIn('course_id', $grants['courses'] ?: [0])
                ->orWhereIn('product_id', $grants['products'] ?: [0]));
        }
        if ($courseId = $request->integer('course_id')) {
            $query->where('course_id', $courseId);
        }

        $exams = $query->get();
        $stats = $this->stats($user, $exams->pluck('id')->all());

        return response()->json([
            'data' => $exams->map(fn (Exam $exam) => $this->present($exam, $stats->get($exam->id, collect())))->values(),
        ]);
    }

    public function show(Request $request, Exam $exam): JsonResponse
    {
        abort_unless($exam->isPublished() || $request->user()->isAdmin(), 404);
        $this->ensureAllowed('take', $exam);
        $exam->load('course:id,title,slug');

        $attempts = ExamAttempt::query()
            ->where('user_id', $request->user()->id)
            ->where('exam_id', $exam->id)
            ->latest('id')
            ->get();

        return response()->json(['data' => [
            ...$this->present($exam, $attempts),
            'description_html' => RichText::toHtml($exam->description),
            'attempts' => $attempts->map(fn (ExamAttempt $a) => [
                'id' => $a->id,
                'status' => ['value' => $a->status->value, 'label' => $a->status->label()],
                'started_at' => $a->started_at->toIso8601String(),
                'submitted_at' => $a->submitted_at?->toIso8601String(),
                'percent' => $a->percent,
                'passed' => $a->passed,
            ])->values(),
        ]]);
    }

    public function start(Request $request, Exam $exam): JsonResponse
    {
        abort_unless($exam->isPublished() || $request->user()->isAdmin(), 404);
        $this->ensureAllowed('take', $exam);

        $attempt = $this->exams->start($request->user(), $exam);
        $attempt->setRelation('exam', $exam);

        return (new AttemptResource($attempt))->response()->setStatusCode($attempt->wasRecentlyCreated ? 201 : 200);
    }

    /**
     * @param  Collection<int, ExamAttempt>  $attempts  this user's attempts at the exam
     * @return array<string, mixed>
     */
    private function present(Exam $exam, Collection $attempts): array
    {
        $finished = $attempts->filter(fn (ExamAttempt $a) => $a->status->isFinished());
        $inProgress = $attempts->first(fn (ExamAttempt $a) => $a->status === AttemptStatus::InProgress && ! $a->isOverdue());
        $used = $attempts->count();

        return [
            'id' => $exam->id,
            'title' => $exam->title,
            'duration_minutes' => $exam->duration_minutes,
            'pass_percent' => $exam->pass_percent,
            'questions_count' => $exam->questions_count,
            'max_attempts' => $exam->max_attempts,
            'course' => $exam->course ? ['id' => $exam->course->id, 'title' => $exam->course->title, 'slug' => $exam->course->slug] : null,
            'is_free' => $exam->course_id === null && $exam->product_id === null,
            'stats' => [
                'attempts_used' => $used,
                'attempts_left' => $exam->max_attempts !== null ? max(0, $exam->max_attempts - $used) : null,
                'best_percent' => $finished->max('percent'),
                'passed' => $finished->contains(fn (ExamAttempt $a) => $a->passed),
                'in_progress_attempt_id' => $inProgress?->id,
            ],
        ];
    }

    /**
     * @param  list<int>  $examIds
     * @return Collection<int, Collection<int, ExamAttempt>>
     */
    private function stats(User $user, array $examIds): Collection
    {
        return ExamAttempt::query()
            ->where('user_id', $user->id)
            ->whereIn('exam_id', $examIds ?: [0])
            ->get(['id', 'exam_id', 'status', 'percent', 'passed', 'deadline_at'])
            ->groupBy('exam_id');
    }
}
