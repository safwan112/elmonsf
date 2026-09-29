<?php

namespace Database\Seeders;

use App\Enums\EnrollmentStatus;
use App\Enums\LessonType;
use App\Enums\PublishStatus;
use App\Models\Category;
use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Exam;
use App\Models\Lesson;
use App\Models\Product;
use App\Models\Question;
use App\Models\QuestionBank;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Original demo learning content: lesson notes, question banks and exams.
 * Development and demos only (see DatabaseSeeder). Idempotent.
 */
class DemoLearningSeeder extends Seeder
{
    public function run(): void
    {
        $this->lessonNotes();

        $quantProduct = Product::query()->where('slug', 'بنك-أسئلة-الكمي')->first();
        $verbalProduct = Product::query()->where('slug', 'بنك-أسئلة-اللفظي')->first();
        $quantCourse = Course::query()->where('slug', 'تأسيس-القسم-الكمي')->first();
        $categories = Category::query()->pluck('id', 'slug');

        $free = $this->bank('بنك تدريبي مجاني — القدرات', null, null, $categories['qudurat'] ?? null, 0,
            'عيّنة مجانية من أسئلة القسمين الكمي واللفظي لتجربة أسلوب التدريب قبل الاشتراك.',
            [...array_slice($this->quantQuestions(), 0, 4), ...array_slice($this->verbalQuestions(), 0, 3)]);
        $quant = $this->bank('بنك أسئلة القسم الكمي', null, $quantProduct?->id, $categories['qudurat-quant'] ?? null, 1,
            'أسئلة مصنّفة حسب الموضوع ومستوى الصعوبة، مع حل مشروح لكل سؤال.', $this->quantQuestions());
        $this->bank('بنك أسئلة القسم اللفظي', null, $verbalProduct?->id, $categories['qudurat-verbal'] ?? null, 2,
            'تناظر لفظي وإكمال جمل وخطأ سياقي بتدرّج مدروس.', $this->verbalQuestions());

        $this->exam('اختبار تحديد المستوى', null, $categories['qudurat'] ?? null, 0, [
            'description' => "اختبار قصير مجاني يقيس مستواك الحالي في القسمين الكمي واللفظي.\n\n- 7 أسئلة\n- 10 دقائق\n- تظهر الإجابات الصحيحة مع الشرح بعد التسليم",
            'duration_minutes' => 10,
            'pass_percent' => 50,
            'max_attempts' => null,
            'shuffle_options' => false,
        ], $free->questions()->orderBy('sort_order')->pluck('id')->all());

        if ($quantCourse) {
            $this->exam('اختبار محاكٍ — القسم الكمي (1)', $quantCourse->id, $categories['qudurat-quant'] ?? null, 1, [
                'description' => "محاكاة لأسئلة القسم الكمي بتوقيت حقيقي.\n\nلديك 3 محاولات، وتتغيّر ترتيب الخيارات في كل محاولة.",
                'duration_minutes' => 15,
                'pass_percent' => 60,
                'max_attempts' => 3,
                'shuffle_options' => true,
            ], $quant->questions()->orderBy('sort_order')->limit(10)->pluck('id')->all());
        }

        // The demo student can explore the course player right away.
        $student = User::query()->where('email', 'student@example.com')->first();
        if ($student && $quantCourse) {
            Enrollment::query()->firstOrCreate(
                ['user_id' => $student->id, 'course_id' => $quantCourse->id],
                ['source' => 'gift', 'status' => EnrollmentStatus::Active, 'starts_at' => now(), 'expires_at' => now()->addDays(90)],
            );
        }
    }

    /** Short study notes for every lesson that has no written content yet. */
    private function lessonNotes(): void
    {
        Lesson::query()->whereNull('content')->with('section')->each(function (Lesson $lesson) {
            $topic = $lesson->section?->title ?? $lesson->title;
            $notes = match ($lesson->type) {
                LessonType::Quiz => "## تدريب سريع: {$topic}\n\nحلّ الأسئلة التالية في ورقة جانبية قبل مشاهدة الحل، ثم انتقل إلى بنك الأسئلة لمزيد من التدريب.\n\n1. اقرأ السؤال كاملاً وحدّد المطلوب.\n2. استبعد الخيارات غير المنطقية أولاً.\n3. سجّل الوقت الذي استغرقته في كل سؤال.",
                default => "## ملخص الدرس\n\nفي هذا الدرس نتناول **{$topic}** خطوة بخطوة:\n\n- الفكرة الأساسية ومتى تُستخدم.\n- أخطاء شائعة وكيف تتجنبها.\n- مثال محلول بطريقة مختصرة توفّر الوقت.\n\n> نصيحة: أعد صياغة القاعدة بكلماتك بعد نهاية الدرس.",
            };
            $lesson->forceFill(['content' => $notes])->saveQuietly();
        });
    }

    /**
     * @param  list<array{0: string, 1: list<string>, 2: int, 3: string, 4: string, 5: string}>  $questions
     *                                                                                                       [body, options, correct index, explanation, difficulty, topic]
     */
    private function bank(string $title, ?int $courseId, ?int $productId, ?int $categoryId, int $sort, string $description, array $questions): QuestionBank
    {
        $bank = QuestionBank::query()->updateOrCreate(['title' => $title], [
            'course_id' => $courseId,
            'product_id' => $productId,
            'category_id' => $categoryId,
            'description' => $description,
            'is_active' => true,
            'sort_order' => $sort,
        ]);

        if ($bank->questions()->exists()) {
            return $bank;
        }

        foreach ($questions as $i => [$body, $options, $correct, $explanation, $difficulty, $topic]) {
            /** @var Question $question */
            $question = $bank->questions()->create([
                'body' => $body,
                'explanation' => $explanation,
                'difficulty' => $difficulty,
                'topic' => $topic,
                'sort_order' => $i,
            ]);
            foreach ($options as $o => $text) {
                $question->options()->create(['body' => $text, 'is_correct' => $o === $correct, 'sort_order' => $o]);
            }
        }

        return $bank;
    }

    /**
     * @param  array<string, mixed>  $settings
     * @param  list<int>  $questionIds
     */
    private function exam(string $title, ?int $courseId, ?int $categoryId, int $sort, array $settings, array $questionIds): void
    {
        $exam = Exam::query()->updateOrCreate(['title' => $title], [
            ...$settings,
            'course_id' => $courseId,
            'category_id' => $categoryId,
            'status' => PublishStatus::Published,
            'published_at' => now()->subDay(),
            'show_answers' => true,
            'sort_order' => $sort,
        ]);

        $exam->questions()->sync(collect($questionIds)->mapWithKeys(fn ($id, $i) => [$id => ['points' => 1, 'sort_order' => $i]])->all());
        $exam->refreshQuestionsCount();
    }

    /** @return list<array{0: string, 1: list<string>, 2: int, 3: string, 4: string, 5: string}> */
    private function quantQuestions(): array
    {
        return [
            ['إذا كان ثمن 4 أقلام يساوي 18 ريالاً، فما ثمن 6 أقلام؟', ['24 ريالاً', '27 ريالاً', '30 ريالاً', '36 ريالاً'], 1,
                'ثمن القلم الواحد = 18 ÷ 4 = 4.5 ريال، إذن ثمن 6 أقلام = 6 × 4.5 = **27 ريالاً**.', 'easy', 'التناسب'],
            ['ما قيمة س إذا كان 3س + 7 = 22؟', ['3', '5', '7', '15'], 1,
                'نطرح 7 من الطرفين: 3س = 15، ثم نقسم على 3: س = **5**.', 'easy', 'الجبر'],
            ['ما 25٪ من 360؟', ['60', '72', '90', '120'], 2,
                '25٪ تعني الربع، و360 ÷ 4 = **90**.', 'easy', 'النسب المئوية'],
            ['مستطيل طوله 12 سم وعرضه 5 سم، ما طول قطره؟', ['13 سم', '14 سم', '15 سم', '17 سم'], 0,
                'بفيثاغورس: القطر² = 12² + 5² = 144 + 25 = 169، إذن القطر = **13 سم**.', 'medium', 'الهندسة'],
            ['متوسط خمسة أعداد 16، فإذا حُذف العدد 20، فما متوسط الأعداد الباقية؟', ['14', '15', '16', '17'], 1,
                'المجموع = 5 × 16 = 80، وبعد حذف 20 يصبح 60، والمتوسط = 60 ÷ 4 = **15**.', 'medium', 'الإحصاء'],
            ['أيهما أكبر: (3/4) أم (0.7)؟', ['3/4 أكبر', '0.7 أكبر', 'متساويان', 'لا يمكن التحديد'], 0,
                '3/4 = 0.75 وهي أكبر من 0.7، إذن **3/4 أكبر**.', 'easy', 'الكسور'],
            ['سيارة تقطع 240 كم في 3 ساعات، كم تقطع في 5 ساعات بنفس السرعة؟', ['350 كم', '380 كم', '400 كم', '420 كم'], 2,
                'السرعة = 240 ÷ 3 = 80 كم/س، والمسافة في 5 ساعات = 80 × 5 = **400 كم**.', 'easy', 'التناسب'],
            ['إذا كان س² = 49 وس < 0، فما قيمة س + 10؟', ['3', '-3', '17', '-17'], 0,
                'س = -7 لأنها سالبة، إذن س + 10 = **3**.', 'medium', 'الجبر'],
            ['زاويتان متكاملتان، إحداهما ضعف الأخرى. ما قياس الصغرى؟', ['30°', '45°', '60°', '90°'], 2,
                'المتكاملتان مجموعهما 180°: س + 2س = 180، إذن س = **60°**.', 'medium', 'الهندسة'],
            ['ارتفع سعر سلعة من 80 إلى 100 ريال. ما نسبة الزيادة؟', ['20٪', '25٪', '30٪', '80٪'], 1,
                'الزيادة = 20، ونسبتها إلى السعر الأصلي = 20 ÷ 80 = **25٪**.', 'medium', 'النسب المئوية'],
            ['ما العدد التالي في المتتابعة: 2، 6، 18، 54، ...؟', ['108', '144', '162', '216'], 2,
                'كل حد يساوي الحد السابق × 3، إذن 54 × 3 = **162**.', 'easy', 'المتتابعات'],
            ['إذا كان أ : ب = 2 : 3 و ب : ج = 4 : 5، فما أ : ج؟', ['8 : 15', '2 : 5', '6 : 10', '3 : 5'], 0,
                'نوحّد ب: أ:ب = 8:12 و ب:ج = 12:15، إذن أ:ج = **8 : 15**.', 'hard', 'التناسب'],
        ];
    }

    /** @return list<array{0: string, 1: list<string>, 2: int, 3: string, 4: string, 5: string}> */
    private function verbalQuestions(): array
    {
        return [
            ['قلم : كتابة', ['مقص : قص', 'ورقة : شجرة', 'باب : منزل', 'ماء : نهر'], 0,
                'العلاقة: أداة ووظيفتها. القلم أداة للكتابة كما أن **المقص أداة للقص**.', 'easy', 'التناظر اللفظي'],
            ['اختر الكلمة المناسبة: العلم نورٌ و...... ظلام.', ['الجهل', 'الليل', 'الكسل', 'الخوف'], 0,
                'المقابلة بين العلم والجهل، والنور والظلام؛ فالكلمة الأنسب **الجهل**.', 'easy', 'إكمال الجمل'],
            ['حدّد الكلمة التي يختل بها المعنى: "كان الطالب مجتهداً فرسب في الاختبار بتفوق".', ['مجتهداً', 'فرسب', 'الاختبار', 'بتفوق'], 1,
                'الاجتهاد والتفوق يقتضيان النجاح، فكلمة **فرسب** هي الخطأ السياقي، وصوابها "فنجح".', 'medium', 'الخطأ السياقي'],
            ['طبيب : مستشفى', ['معلم : مدرسة', 'مريض : دواء', 'كتاب : مكتبة', 'سيارة : طريق'], 0,
                'العلاقة: شخص ومكان عمله؛ فالطبيب يعمل في المستشفى كما يعمل **المعلم في المدرسة**.', 'easy', 'التناظر اللفظي'],
            ['اختر الكلمة المناسبة: لا يُدرك النجاح إلا بـ...... والصبر.', ['المثابرة', 'الراحة', 'التردد', 'المصادفة'], 0,
                'السياق يمدح أسباب النجاح، والكلمة المتسقة مع "الصبر" هي **المثابرة**.', 'easy', 'إكمال الجمل'],
            ['بذرة : شجرة', ['طفل : رجل', 'ماء : ثلج', 'ورقة : غصن', 'نهر : بحر'], 0,
                'العلاقة: مرحلة أولى تنمو إلى مرحلة ناضجة، كما ينمو **الطفل ليصبح رجلاً**.', 'medium', 'التناظر اللفظي'],
            ['حدّد الكلمة التي يختل بها المعنى: "أشرقت الشمس فعمّ الظلام أرجاء المدينة".', ['أشرقت', 'الشمس', 'الظلام', 'المدينة'], 2,
                'إشراق الشمس يعقبه النور لا **الظلام**، فهي الكلمة المخالفة للسياق.', 'easy', 'الخطأ السياقي'],
            ['ما معنى كلمة "الوجيز" في قولنا: كتابٌ وجيز؟', ['المختصر', 'الطويل', 'الصعب', 'القديم'], 0,
                'الوجيز هو **المختصر** الذي يؤدي المعنى بأقل الألفاظ.', 'medium', 'المفردات'],
            ['شمس : نهار', ['قمر : ليل', 'نجم : سماء', 'غيم : مطر', 'ضوء : ظل'], 0,
                'العلاقة: جرم سماوي يرتبط بوقت ظهوره؛ الشمس للنهار كما أن **القمر لليل**.', 'medium', 'التناظر اللفظي'],
            ['اختر الكلمة المناسبة: كلما ازدادت معرفة الإنسان ازداد...... بجهله.', ['شعوراً', 'فخراً', 'تمسكاً', 'بعداً'], 0,
                'المعنى أن العالم يدرك حدود علمه، فيزداد **شعوراً** بما يجهله.', 'hard', 'إكمال الجمل'],
        ];
    }
}
