<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Enums\QuestionDifficulty;
use App\Exceptions\DomainException;
use App\Http\Controllers\Api\V1\Admin\Concerns\AdminCrud;
use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\QuestionOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Question banks and their questions (with options and the correct answer).
 */
class QuestionBankController extends Controller
{
    use AdminCrud;

    public function index(): JsonResponse
    {
        $banks = QuestionBank::query()
            ->with(['course:id,title', 'product:id,title', 'category:id,name'])
            ->orderBy('sort_order')->orderBy('id')
            ->get();

        return response()->json(['data' => $banks->map(fn (QuestionBank $b) => $this->presentBank($b))->values()]);
    }

    public function store(Request $request): JsonResponse
    {
        $bank = QuestionBank::query()->create($this->bankData($request))->refresh();
        $this->audit('question_bank.created', $bank);

        return response()->json(['data' => $this->presentBank($bank->load(['course:id,title', 'product:id,title', 'category:id,name']))], 201);
    }

    public function update(Request $request, QuestionBank $bank): JsonResponse
    {
        $data = $this->bankData($request, true);
        $bank->update($data);
        $this->audit('question_bank.updated', $bank, ['fields' => array_keys($data)]);

        return response()->json(['data' => $this->presentBank($bank->load(['course:id,title', 'product:id,title', 'category:id,name']))]);
    }

    public function destroy(QuestionBank $bank): JsonResponse
    {
        $inExams = DB::table('exam_questions')->whereIn('question_id', $bank->questions()->select('id'))->exists();
        if ($inExams) {
            $bank->update(['is_active' => false]);
            $this->audit('question_bank.deactivated', $bank);

            return response()->json(['message' => __('admin.deactivated')]);
        }

        $bank->delete();
        $this->audit('question_bank.deleted', $bank, ['title' => $bank->title]);

        return response()->json(['message' => __('admin.deleted')]);
    }

    // ---- Questions -------------------------------------------------------

    public function questions(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'bank_id' => ['nullable', 'integer'],
            'search' => ['nullable', 'string', 'max:100'],
            'difficulty' => ['nullable', Rule::enum(QuestionDifficulty::class)],
            'topic' => ['nullable', 'string', 'max:100'],
        ]);

        $page = Question::query()
            ->with(['options', 'bank:id,title'])
            ->when($filters['bank_id'] ?? null, fn ($q, $id) => $q->where('question_bank_id', $id))
            ->when($filters['search'] ?? null, fn ($q, $s) => $q->where('body', 'ilike', $this->like($s)))
            ->when($filters['difficulty'] ?? null, fn ($q, $d) => $q->where('difficulty', $d))
            ->when($filters['topic'] ?? null, fn ($q, $t) => $q->where('topic', $t))
            ->orderBy('question_bank_id')->orderBy('sort_order')->orderBy('id')
            ->paginate($this->perPage($request))
            ->withQueryString();

        return $this->paginated($page, fn (Question $q) => $this->presentQuestion($q));
    }

    public function storeQuestion(Request $request): JsonResponse
    {
        $data = $this->questionData($request);

        $question = DB::transaction(function () use ($data) {
            $options = $data['options'];
            unset($data['options']);
            $data['sort_order'] ??= (int) Question::query()->where('question_bank_id', $data['question_bank_id'])->max('sort_order') + 1;
            $question = Question::query()->create($data)->refresh();
            $this->syncOptions($question, $options);

            return $question;
        });
        $this->audit('question.created', $question);

        return response()->json(['data' => $this->presentQuestion($question->load(['options', 'bank:id,title']))], 201);
    }

    public function updateQuestion(Request $request, Question $question): JsonResponse
    {
        $data = $this->questionData($request, $question);

        DB::transaction(function () use ($question, $data) {
            $options = $data['options'] ?? null;
            unset($data['options']);
            $question->update($data);
            if ($options !== null) {
                $this->syncOptions($question, $options);
            }
        });
        $this->audit('question.updated', $question, ['fields' => array_keys($data)]);

        return response()->json(['data' => $this->presentQuestion($question->load(['options', 'bank:id,title']))]);
    }

    public function destroyQuestion(Question $question): JsonResponse
    {
        if (DB::table('exam_questions')->where('question_id', $question->id)->exists()) {
            $question->update(['is_active' => false]);
            $this->audit('question.deactivated', $question);

            return response()->json(['message' => __('admin.question_in_use')]);
        }

        $question->delete();
        $this->audit('question.deleted', $question);

        return response()->json(['message' => __('admin.deleted')]);
    }

    /** @return array<string, mixed> */
    private function bankData(Request $request, bool $partial = false): array
    {
        return $request->validate([
            'title' => [$partial ? 'sometimes' : 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string', 'max:5000'],
            'category_id' => ['sometimes', 'nullable', 'integer', 'exists:categories,id'],
            'course_id' => ['sometimes', 'nullable', 'integer', 'exists:courses,id'],
            'product_id' => ['sometimes', 'nullable', 'integer', 'exists:products,id'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:100000'],
        ]);
    }

    /** @return array<string, mixed> */
    private function questionData(Request $request, ?Question $question = null): array
    {
        $partial = $question !== null;
        $data = $request->validate([
            'question_bank_id' => [$partial ? 'sometimes' : 'required', 'integer', 'exists:question_banks,id'],
            'body' => [$partial ? 'sometimes' : 'required', 'string', 'max:10000'],
            'explanation' => ['sometimes', 'nullable', 'string', 'max:10000'],
            'difficulty' => ['sometimes', Rule::enum(QuestionDifficulty::class)],
            'topic' => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'options' => [$partial ? 'sometimes' : 'required', 'array', 'min:2', 'max:6'],
            'options.*.id' => ['nullable', 'integer'],
            'options.*.body' => ['required', 'string', 'max:1000'],
            'options.*.is_correct' => ['required', 'boolean'],
        ]);

        if (isset($data['options']) && collect($data['options'])->where('is_correct', true)->count() !== 1) {
            throw new DomainException(__('admin.question_needs_correct'), 'question_needs_correct');
        }

        return $data;
    }

    /**
     * Update options in place (keeping ids stable for past answers), add new
     * ones and remove the rest.
     *
     * @param  list<array{id?: int|null, body: string, is_correct: bool}>  $options
     */
    private function syncOptions(Question $question, array $options): void
    {
        $existing = $question->options()->get()->keyBy('id');
        $kept = [];

        foreach (array_values($options) as $i => $option) {
            $model = isset($option['id']) ? $existing->get($option['id']) : null;
            $model ??= new QuestionOption(['question_id' => $question->id]);
            $model->forceFill(['question_id' => $question->id, 'body' => $option['body'], 'is_correct' => (bool) $option['is_correct'], 'sort_order' => $i])->save();
            $kept[] = $model->id;
        }

        $question->options()->whereNotIn('id', $kept)->delete();
    }

    /** @return array<string, mixed> */
    private function presentBank(QuestionBank $b): array
    {
        return [
            'id' => $b->id,
            'title' => $b->title,
            'description' => $b->description,
            'category_id' => $b->category_id,
            'course_id' => $b->course_id,
            'product_id' => $b->product_id,
            'category' => $b->category ? ['id' => $b->category->id, 'name' => $b->category->name] : null,
            'course' => $b->course ? ['id' => $b->course->id, 'title' => $b->course->title] : null,
            'product' => $b->product ? ['id' => $b->product->id, 'title' => $b->product->title] : null,
            'is_active' => $b->is_active,
            'sort_order' => $b->sort_order,
            'questions_count' => $b->questions_count,
        ];
    }

    /** @return array<string, mixed> */
    private function presentQuestion(Question $q): array
    {
        return [
            'id' => $q->id,
            'question_bank_id' => $q->question_bank_id,
            'bank' => $q->bank ? ['id' => $q->bank->id, 'title' => $q->bank->title] : null,
            'body' => $q->body,
            'explanation' => $q->explanation,
            'difficulty' => ['value' => $q->difficulty->value, 'label' => $q->difficulty->label()],
            'topic' => $q->topic,
            'is_active' => $q->is_active,
            'sort_order' => $q->sort_order,
            'options' => $q->options->map(fn (QuestionOption $o) => ['id' => $o->id, 'body' => $o->body, 'is_correct' => $o->is_correct])->values(),
        ];
    }
}
