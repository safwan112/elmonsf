<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Enums\QuestionDifficulty;
use App\Http\Controllers\Api\V1\Learning\Concerns\GuardsLearningAccess;
use App\Http\Controllers\Controller;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\QuestionOption;
use App\Models\QuestionPractice;
use App\Models\User;
use App\Services\Learning\LearningAccess;
use App\Support\RichText;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Question-bank practice: filter questions by topic/difficulty/status and
 * get instant, server-checked feedback with an explanation.
 */
class QuestionBankController extends Controller
{
    use GuardsLearningAccess;

    public function __construct(private readonly LearningAccess $access) {}

    /** All active banks; locked ones point to what unlocks them. */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $banks = QuestionBank::query()
            ->active()
            ->with(['course:id,title,slug', 'product:id,title,slug', 'category:id,name'])
            ->orderBy('sort_order')->orderBy('id')
            ->get();

        $stats = $this->stats($user, $banks->pluck('id')->all());

        return response()->json([
            'data' => $banks->map(fn (QuestionBank $bank) => $this->present($user, $bank, $stats[$bank->id] ?? null))->values(),
        ]);
    }

    public function show(Request $request, QuestionBank $bank): JsonResponse
    {
        abort_unless($bank->is_active || $request->user()->isAdmin(), 404);
        $this->ensureAllowed('practice', $bank);
        $bank->load(['course:id,title,slug', 'product:id,title,slug', 'category:id,name']);

        $topics = $bank->questions()
            ->where('is_active', true)
            ->whereNotNull('topic')
            ->groupBy('topic')
            ->orderBy('topic')
            ->get([DB::raw('topic as name'), DB::raw('count(*) as questions_count')]);

        $user = $request->user();

        return response()->json(['data' => [
            ...$this->present($user, $bank, $this->stats($user, [$bank->id])[$bank->id] ?? null),
            'description_html' => RichText::toHtml($bank->description),
            'topics' => $topics->map(fn ($t) => ['name' => $t->name, 'questions_count' => (int) $t->questions_count])->values(),
        ]]);
    }

    public function questions(Request $request, QuestionBank $bank): JsonResponse
    {
        abort_unless($bank->is_active || $request->user()->isAdmin(), 404);
        $this->ensureAllowed('practice', $bank);

        $filters = $request->validate([
            'topic' => ['nullable', 'string', 'max:100'],
            'difficulty' => ['nullable', Rule::enum(QuestionDifficulty::class)],
            'status' => ['nullable', Rule::in(['all', 'unanswered', 'incorrect', 'correct'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $user = $request->user();

        $practice = fn ($q) => $q->select('question_id')->from('question_practice')->where('user_id', $user->id);
        $status = $filters['status'] ?? 'all';

        $page = $bank->questions()
            ->where('is_active', true)
            ->when($filters['topic'] ?? null, fn ($q, $topic) => $q->where('topic', $topic))
            ->when($filters['difficulty'] ?? null, fn ($q, $d) => $q->where('difficulty', $d))
            ->when($status === 'unanswered', fn ($q) => $q->whereNotIn('id', $practice))
            ->when($status === 'incorrect', fn ($q) => $q->whereIn('id', fn ($s) => $practice($s)->where('is_correct', false)))
            ->when($status === 'correct', fn ($q) => $q->whereIn('id', fn ($s) => $practice($s)->where('is_correct', true)))
            ->with('options')
            ->orderBy('sort_order')->orderBy('id')
            ->paginate($filters['per_page'] ?? 10)
            ->withQueryString();

        $answers = QuestionPractice::query()
            ->where('user_id', $user->id)
            ->whereIn('question_id', $page->getCollection()->pluck('id'))
            ->get()
            ->keyBy('question_id');

        $page->setCollection($page->getCollection()->map(function (Question $question) use ($answers) {
            $answer = $answers->get($question->id);

            return [
                'id' => $question->id,
                'body_html' => RichText::toHtml($question->body),
                'difficulty' => ['value' => $question->difficulty->value, 'label' => $question->difficulty->label()],
                'topic' => $question->topic,
                'options' => $question->options->map(fn (QuestionOption $o) => ['id' => $o->id, 'body' => $o->body])->values(),
                // Already answered: the student has seen the solution.
                'practice' => $answer ? [
                    'selected_option_id' => $answer->option_id,
                    'is_correct' => $answer->is_correct,
                    'correct_option_id' => $question->correctOption()?->id,
                    'explanation_html' => RichText::toHtml($question->explanation),
                    'attempts' => $answer->attempts,
                ] : null,
            ];
        }));

        return JsonResource::collection($page)->response();
    }

    public function answer(Request $request, QuestionBank $bank, Question $question): JsonResponse
    {
        abort_unless($question->question_bank_id === $bank->id && $question->is_active, 404);
        abort_unless($bank->is_active || $request->user()->isAdmin(), 404);
        $this->ensureAllowed('practice', $bank);

        $question->load('options');
        $data = $request->validate([
            'option_id' => ['required', 'integer', Rule::in($question->options->pluck('id')->all())],
        ]);

        $correct = $question->correctOption();
        $isCorrect = $correct !== null && $correct->id === (int) $data['option_id'];
        $user = $request->user();

        DB::transaction(function () use ($user, $question, $bank, $data, $isCorrect) {
            $practice = QuestionPractice::query()
                ->where('user_id', $user->id)
                ->where('question_id', $question->id)
                ->lockForUpdate()
                ->first();

            if ($practice) {
                $practice->forceFill([
                    'option_id' => $data['option_id'],
                    'is_correct' => $isCorrect,
                    'attempts' => $practice->attempts + 1,
                    'answered_at' => now(),
                ])->save();
            } else {
                QuestionPractice::query()->insertOrIgnore([
                    'user_id' => $user->id,
                    'question_id' => $question->id,
                    'question_bank_id' => $bank->id,
                    'option_id' => $data['option_id'],
                    'is_correct' => $isCorrect,
                    'attempts' => 1,
                    'answered_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        });

        return response()->json(['data' => [
            'question_id' => $question->id,
            'selected_option_id' => (int) $data['option_id'],
            'is_correct' => $isCorrect,
            'correct_option_id' => $correct?->id,
            'explanation_html' => RichText::toHtml($question->explanation),
        ]]);
    }

    /**
     * @param  array{answered: int, correct: int}|null  $stats
     * @return array<string, mixed>
     */
    private function present(User $user, QuestionBank $bank, ?array $stats): array
    {
        $unlocked = $this->access->canUseBank($user, $bank);

        return [
            'id' => $bank->id,
            'title' => $bank->title,
            'category' => $bank->category ? ['id' => $bank->category->id, 'name' => $bank->category->name] : null,
            'questions_count' => $bank->questions_count,
            'is_free' => $bank->course_id === null && $bank->product_id === null,
            'is_unlocked' => $unlocked,
            // What to buy to unlock it.
            'unlock' => $unlocked ? null : [
                'course' => $bank->course ? ['id' => $bank->course->id, 'title' => $bank->course->title, 'slug' => $bank->course->slug] : null,
                'product' => $bank->product ? ['id' => $bank->product->id, 'title' => $bank->product->title, 'slug' => $bank->product->slug] : null,
            ],
            'stats' => [
                'answered' => $stats['answered'] ?? 0,
                'correct' => $stats['correct'] ?? 0,
            ],
        ];
    }

    /**
     * @param  list<int>  $bankIds
     * @return array<int, array{answered: int, correct: int}>
     */
    private function stats(User $user, array $bankIds): array
    {
        return QuestionPractice::query()
            ->where('user_id', $user->id)
            ->whereIn('question_bank_id', $bankIds ?: [0])
            ->groupBy('question_bank_id')
            ->get([
                'question_bank_id',
                DB::raw('count(*) as answered'),
                DB::raw('count(*) filter (where is_correct) as correct'),
            ])
            ->mapWithKeys(fn ($row) => [(int) $row->question_bank_id => ['answered' => (int) $row->answered, 'correct' => (int) $row->correct]])
            ->all();
    }
}
