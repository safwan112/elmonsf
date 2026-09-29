<?php

namespace App\Http\Controllers\Api\V1\Learning;

use App\Http\Controllers\Controller;
use App\Http\Resources\Learning\AttemptResource;
use App\Models\ExamAttempt;
use App\Services\Learning\ExamService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AttemptController extends Controller
{
    public function __construct(private readonly ExamService $exams) {}

    public function show(Request $request, ExamAttempt $attempt): AttemptResource
    {
        Gate::authorize('view', $attempt);

        return new AttemptResource($this->exams->closeIfOverdue($attempt)->load('exam'));
    }

    /** Autosave one answer and/or the review flag. */
    public function answer(Request $request, ExamAttempt $attempt): JsonResponse
    {
        Gate::authorize('update', $attempt);

        $data = $request->validate([
            'question_id' => ['required', 'integer'],
            'option_id' => ['nullable', 'integer'],
            'flagged' => ['nullable', 'boolean'],
        ]);

        $answer = $this->exams->saveAnswer(
            $attempt,
            (int) $data['question_id'],
            $request->exists('option_id'),
            isset($data['option_id']) ? (int) $data['option_id'] : null,
            isset($data['flagged']) ? (bool) $data['flagged'] : null,
        );

        return response()->json(['data' => [
            'question_id' => $answer->question_id,
            'option_id' => $answer->option_id,
            'is_flagged' => $answer->is_flagged,
        ]]);
    }

    public function submit(Request $request, ExamAttempt $attempt): JsonResponse
    {
        Gate::authorize('update', $attempt);

        $attempt = $this->exams->submit($attempt)->load('exam');

        return (new AttemptResource($attempt))->additional(['message' => __('learning.attempt_submitted')])->response();
    }
}
