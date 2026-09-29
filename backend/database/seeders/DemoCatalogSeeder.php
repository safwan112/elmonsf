<?php

namespace Database\Seeders;

use App\Enums\CourseLevel;
use App\Enums\LessonType;
use App\Enums\ProductType;
use App\Enums\PublishStatus;
use App\Models\Category;
use App\Models\Course;
use App\Models\Instructor;
use App\Models\Lesson;
use App\Models\Product;
use App\Models\Section;
use App\Models\Tag;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Original Arabic demo catalog for local development and demos.
 * Not run in production (see DatabaseSeeder).
 */
class DemoCatalogSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $categories = $this->categories();
            $instructors = $this->instructors();
            $this->courses($categories, $instructors);
            $this->products($categories);
        });
    }

    /**
     * @return array<string, Category>
     */
    private function categories(): array
    {
        $tree = [
            ['qudurat', 'القدرات العامة', 'target', 'تدريب شامل على القسمين الكمي واللفظي لاختبار القدرات العامة.', [
                ['qudurat-quant', 'القسم الكمي', 'calculator', 'الحساب والجبر والهندسة والإحصاء وتحليل البيانات.'],
                ['qudurat-verbal', 'القسم اللفظي', 'book-open', 'التناظر اللفظي وإكمال الجمل والاستيعاب المقروء.'],
            ]],
            ['tahsili', 'التحصيلي', 'graduation-cap', 'مراجعة مركّزة لمواد المرحلة الثانوية العلمية.', [
                ['tahsili-math', 'الرياضيات', 'sigma', 'مفاهيم الرياضيات الأساسية لاختبار التحصيلي.'],
                ['tahsili-physics', 'الفيزياء', 'atom', 'الحركة والطاقة والكهرباء والموجات.'],
                ['tahsili-chemistry', 'الكيمياء', 'flask-conical', 'التفاعلات والمحاليل والكيمياء العضوية.'],
                ['tahsili-biology', 'الأحياء', 'leaf', 'الخلية والوراثة وأجهزة جسم الإنسان.'],
            ]],
            ['skills', 'مهارات الاختبارات', 'lightbulb', 'استراتيجيات إدارة الوقت والتعامل مع ضغط الاختبار.', []],
        ];

        $map = [];
        foreach ($tree as $i => [$slug, $name, $icon, $description, $children]) {
            $parent = Category::query()->updateOrCreate(['slug' => $slug], [
                'name' => $name, 'icon' => $icon, 'description' => $description, 'sort_order' => $i, 'is_active' => true,
            ]);
            $map[$slug] = $parent;
            foreach ($children as $j => [$cSlug, $cName, $cIcon, $cDescription]) {
                $map[$cSlug] = Category::query()->updateOrCreate(['slug' => $cSlug], [
                    'parent_id' => $parent->id, 'name' => $cName, 'icon' => $cIcon,
                    'description' => $cDescription, 'sort_order' => $j, 'is_active' => true,
                ]);
            }
        }

        return $map;
    }

    /**
     * @return array<string, Instructor>
     */
    private function instructors(): array
    {
        $demoUser = User::query()->where('email', 'instructor@example.com')->first();

        $rows = [
            ['sara-alharbi', 'أ. سارة الحربي', 'مدرّبة القسم الكمي — 9 سنوات خبرة', "تخصصت سارة في تبسيط المسائل الكمية وتحويلها إلى خطوات قصيرة قابلة للتطبيق تحت ضغط الوقت.\n\nدرّبت آلاف الطلاب على اختبارات القدرات، وتؤمن بأن الفهم يسبق الحفظ دائماً.", $demoUser?->id],
            ['fahad-alotaibi', 'أ. فهد العتيبي', 'مدرّب القسم اللفظي', 'يركّز فهد على بناء الحس اللغوي عبر أمثلة من نصوص حقيقية، مع تمارين يومية قصيرة للتناظر وإكمال الجمل.', null],
            ['noura-alshammari', 'د. نورة الشمري', 'مدرّبة مواد التحصيلي العلمية', 'حاصلة على الدكتوراه في تعليم العلوم، وتقدّم مراجعات مركّزة تربط المفاهيم ببعضها بدل حفظها منفصلة.', null],
        ];

        $map = [];
        foreach ($rows as $i => [$slug, $name, $headline, $bio, $userId]) {
            $map[$slug] = Instructor::query()->updateOrCreate(['slug' => $slug], [
                'user_id' => $userId, 'name' => $name, 'headline' => $headline, 'bio' => $bio,
                'is_active' => true, 'sort_order' => $i,
            ]);
        }

        return $map;
    }

    /**
     * @param  array<string, Category>  $categories
     * @param  array<string, Instructor>  $instructors
     */
    private function courses(array $categories, array $instructors): void
    {
        $courses = [
            [
                'slug' => 'تأسيس-القسم-الكمي', 'category' => 'qudurat-quant', 'instructor' => 'sara-alharbi',
                'title' => 'تأسيس القسم الكمي من الصفر', 'level' => CourseLevel::Beginner, 'featured' => true,
                'subtitle' => 'ابنِ أساساً متيناً في الحساب والجبر والهندسة قبل الانتقال إلى أسئلة الاختبار.',
                'outcomes' => ['إتقان العمليات الحسابية الذهنية السريعة', 'حل المعادلات والمتباينات بثقة', 'فهم قواعد الهندسة الأساسية وتطبيقها', 'قراءة الجداول والرسوم البيانية بدقة'],
                'plans' => [[90, 19900, 29900], [180, 29900, 44900]], 'students' => 1840, 'rating' => [4.8, 312],
                'sections' => ['مهارات الحساب الذهني', 'الكسور والنسب', 'الجبر والمعادلات', 'أساسيات الهندسة'],
            ],
            [
                'slug' => 'استراتيجيات-الكمي-المتقدمة', 'category' => 'qudurat-quant', 'instructor' => 'sara-alharbi',
                'title' => 'استراتيجيات الكمي المتقدمة', 'level' => CourseLevel::Advanced, 'featured' => true,
                'subtitle' => 'اختصارات وأساليب حل تختصر الوقت في المسائل الطويلة والمركّبة.',
                'outcomes' => ['حل المسائل بالتعويض والاستبعاد', 'التعامل مع أسئلة المقارنة بذكاء', 'إدارة الوقت في الأقسام الكمية'],
                'plans' => [[90, 24900, 34900], [180, 34900, 49900]], 'students' => 960, 'rating' => [4.9, 188],
                'sections' => ['أسئلة المقارنة', 'المسائل اللفظية', 'الاحتمالات والإحصاء', 'اختبارات محاكية'],
            ],
            [
                'slug' => 'اللفظي-الشامل', 'category' => 'qudurat-verbal', 'instructor' => 'fahad-alotaibi',
                'title' => 'القسم اللفظي الشامل', 'level' => CourseLevel::AllLevels, 'featured' => true,
                'subtitle' => 'التناظر اللفظي، إكمال الجمل، الخطأ السياقي، واستيعاب المقروء في دورة واحدة.',
                'outcomes' => ['تحديد العلاقة في التناظر خلال ثوانٍ', 'استنتاج الكلمة المناسبة من السياق', 'قراءة النصوص الطويلة بسرعة وفهم'],
                'plans' => [[90, 19900, null], [180, 29900, 39900]], 'students' => 1420, 'rating' => [4.7, 256],
                'sections' => ['التناظر اللفظي', 'إكمال الجمل', 'الخطأ السياقي', 'استيعاب المقروء'],
            ],
            [
                'slug' => 'رياضيات-التحصيلي', 'category' => 'tahsili-math', 'instructor' => 'noura-alshammari',
                'title' => 'رياضيات التحصيلي في 30 يوماً', 'level' => CourseLevel::Intermediate, 'featured' => false,
                'subtitle' => 'خطة مراجعة يومية تغطي أهم موضوعات الرياضيات للمرحلة الثانوية.',
                'outcomes' => ['مراجعة الدوال والمتتابعات', 'حل مسائل الهندسة التحليلية', 'التدرّب على نمط أسئلة التحصيلي'],
                'plans' => [[60, 14900, 19900], [120, 21900, null]], 'students' => 640, 'rating' => [4.6, 97],
                'sections' => ['الدوال', 'المتتابعات', 'حساب المثلثات', 'الهندسة التحليلية'],
            ],
            [
                'slug' => 'فيزياء-التحصيلي', 'category' => 'tahsili-physics', 'instructor' => 'noura-alshammari',
                'title' => 'فيزياء التحصيلي المركّزة', 'level' => CourseLevel::Intermediate, 'featured' => false,
                'subtitle' => 'القوانين الأساسية مع أمثلة محلولة تشبه أسئلة الاختبار.',
                'outcomes' => ['فهم قوانين الحركة ونيوتن', 'حل مسائل الشغل والطاقة', 'أساسيات الكهرباء والدوائر'],
                'plans' => [[60, 14900, null], [120, 21900, null]], 'students' => 410, 'rating' => [4.5, 61],
                'sections' => ['الحركة', 'القوى', 'الطاقة', 'الكهرباء'],
            ],
            [
                'slug' => 'كيمياء-التحصيلي', 'category' => 'tahsili-chemistry', 'instructor' => 'noura-alshammari',
                'title' => 'كيمياء التحصيلي خطوة بخطوة', 'level' => CourseLevel::Beginner, 'featured' => false,
                'subtitle' => 'من الجدول الدوري إلى الكيمياء العضوية بأسلوب مبسّط.',
                'outcomes' => ['قراءة الجدول الدوري بفهم', 'موازنة المعادلات الكيميائية', 'تمييز المركبات العضوية الأساسية'],
                'plans' => [[60, 12900, 17900]], 'students' => 330, 'rating' => [4.6, 44],
                'sections' => ['الذرة والجدول الدوري', 'الروابط', 'التفاعلات', 'الكيمياء العضوية'],
            ],
            [
                'slug' => 'ادارة-وقت-الاختبار', 'category' => 'skills', 'instructor' => 'fahad-alotaibi',
                'title' => 'إدارة وقت الاختبار وضغطه', 'level' => CourseLevel::AllLevels, 'featured' => false,
                'subtitle' => 'دورة قصيرة تساعدك على توزيع وقتك والتعامل مع القلق يوم الاختبار.',
                'outcomes' => ['خطة توزيع الوقت بين الأسئلة', 'تقنيات تهدئة سريعة', 'روتين الأسبوع الأخير قبل الاختبار'],
                'plans' => [[365, 4900, 9900]], 'students' => 2210, 'rating' => [4.8, 402],
                'sections' => ['قبل الاختبار', 'أثناء الاختبار'],
            ],
            [
                'slug' => 'أحياء-التحصيلي', 'category' => 'tahsili-biology', 'instructor' => 'noura-alshammari',
                'title' => 'أحياء التحصيلي', 'level' => CourseLevel::Beginner, 'featured' => false,
                'subtitle' => 'قريباً — الدورة قيد الإعداد.', 'draft' => true,
                'outcomes' => ['الخلية', 'الوراثة'], 'plans' => [[60, 12900, null]], 'students' => 0, 'rating' => [0, 0],
                'sections' => ['الخلية', 'الوراثة'],
            ],
        ];

        $lessonTitles = ['مقدمة وأهداف الوحدة', 'شرح المفهوم بالأمثلة', 'تدريبات محلولة', 'أخطاء شائعة وكيف تتجنبها', 'تقييم الوحدة'];
        $tags = collect(['قدرات', 'تحصيلي', 'تأسيس', 'مراجعة', 'استراتيجيات'])
            ->mapWithKeys(fn ($name) => [$name => Tag::query()->firstOrCreate(['slug' => $name], ['name' => $name])]);

        foreach ($courses as $index => $c) {
            $course = Course::query()->updateOrCreate(['slug' => $c['slug']], [
                'category_id' => $categories[$c['category']]->id,
                'instructor_id' => $instructors[$c['instructor']]->id,
                'title' => $c['title'],
                'subtitle' => $c['subtitle'],
                'description' => $this->courseDescription($c['title']),
                'level' => $c['level'],
                'status' => ($c['draft'] ?? false) ? PublishStatus::Draft : PublishStatus::Published,
                'is_featured' => $c['featured'],
                'published_at' => ($c['draft'] ?? false) ? null : now()->subDays(40 - $index * 4),
                'outcomes' => $c['outcomes'],
                'requirements' => ['لا يلزم أي تحضير مسبق', 'جهاز متصل بالإنترنت (جوال أو حاسب)'],
            ]);
            $course->forceFill([
                'students_count' => $c['students'],
                'rating_avg' => $c['rating'][0],
                'rating_count' => $c['rating'][1],
            ])->saveQuietly();

            $course->tags()->sync($tags->only(str_starts_with($c['category'], 'qudurat') ? ['قدرات', 'استراتيجيات'] : ['تحصيلي', 'مراجعة'])->pluck('id'));

            $course->plans()->delete();
            foreach ($c['plans'] as $i => [$days, $price, $compare]) {
                $course->plans()->create([
                    'name' => $days >= 365 ? 'وصول لمدة سنة' : ($days % 30 === 0 ? ($days / 30).' أشهر' : "{$days} يوماً"),
                    'duration_days' => $days,
                    'price_amount' => $price,
                    'compare_at_amount' => $compare,
                    'currency' => 'SAR',
                    'is_active' => true,
                    'is_default' => $i === count($c['plans']) - 1,
                    'sort_order' => $i,
                ]);
            }

            $course->sections()->delete();
            foreach ($c['sections'] as $s => $sectionTitle) {
                $section = Section::query()->create(['course_id' => $course->id, 'title' => $sectionTitle, 'sort_order' => $s]);
                foreach ($lessonTitles as $l => $lessonTitle) {
                    $isText = $l === 0;
                    Lesson::query()->create([
                        'course_id' => $course->id,
                        'section_id' => $section->id,
                        'title' => "{$sectionTitle}: {$lessonTitle}",
                        'type' => $l === 4 ? LessonType::Quiz : ($isText ? LessonType::Text : LessonType::Video),
                        'content' => $isText ? $this->previewContent($sectionTitle) : null,
                        'duration_seconds' => $isText ? 300 : 420 + (($s * 5 + $l) * 97) % 900,
                        'is_preview' => $s === 0 && $l <= 1,
                        'is_published' => true,
                        'sort_order' => $l,
                    ]);
                }
            }
        }
    }

    /**
     * @param  array<string, Category>  $categories
     */
    private function products(array $categories): void
    {
        $products = [
            ['بنك-أسئلة-الكمي', 'بنك أسئلة القسم الكمي — 1500 سؤال', ProductType::QuestionBank, 'qudurat-quant', 7900, 11900, true,
                'أسئلة مصنّفة حسب الموضوع ومستوى الصعوبة، مع حل مشروح لكل سؤال.'],
            ['بنك-أسئلة-اللفظي', 'بنك أسئلة القسم اللفظي — 1200 سؤال', ProductType::QuestionBank, 'qudurat-verbal', 6900, null, true,
                'تناظر وإكمال جمل وخطأ سياقي واستيعاب مقروء بتدرّج مدروس.'],
            ['ملخص-قوانين-الكمي', 'ملخّص قوانين الكمي (PDF)', ProductType::Ebook, 'qudurat-quant', 2900, null, false,
                'كل القوانين والقواعد التي تحتاجها في 40 صفحة مرتّبة، قابلة للطباعة.'],
            ['حزمة-التحصيلي-العلمية', 'حزمة التحصيلي العلمية', ProductType::Bundle, 'tahsili', 14900, 21900, false,
                'ملخصات الرياضيات والفيزياء والكيمياء والأحياء في حزمة واحدة بسعر مخفّض.'],
        ];

        foreach ($products as $i => [$slug, $title, $type, $category, $price, $compare, $featured, $subtitle]) {
            Product::query()->updateOrCreate(['slug' => $slug], [
                'category_id' => $categories[$category]->id,
                'title' => $title,
                'type' => $type,
                'subtitle' => $subtitle,
                'description' => "{$subtitle}\n\n## ماذا ستحصل عليه\n\n- وصول فوري بعد إتمام الدفع\n- تحديثات مجانية عند إضافة محتوى جديد\n- ملف متوافق مع الجوال والحاسب\n\n## لمن هذا المنتج؟\n\nللطلاب الذين يريدون تدريباً إضافياً مركّزاً إلى جانب الدورات.",
                'price_amount' => $price,
                'compare_at_amount' => $compare,
                'currency' => 'SAR',
                'status' => PublishStatus::Published,
                'is_featured' => $featured,
                'published_at' => now()->subDays(20 - $i),
            ]);
        }
    }

    private function courseDescription(string $title): string
    {
        return <<<MD
        صُمّمت «{$title}» لتنقلك خطوة بخطوة من فهم الفكرة إلى تطبيقها بسرعة ودقة. كل وحدة تبدأ بشرح مختصر، ثم أمثلة محلولة، ثم تدريبات تقيس بها فهمك قبل الانتقال لما بعدها.

        ## كيف تستفيد منها أكثر؟

        1. التزم بوحدة واحدة يومياً على الأقل.
        2. حُل التدريبات قبل مشاهدة الحل.
        3. عُد إلى «الأخطاء الشائعة» في نهاية كل وحدة.

        > نصيحة: الاستمرار اليومي لمدة قصيرة أفضل من جلسة طويلة متقطعة.
        MD;
    }

    private function previewContent(string $sectionTitle): string
    {
        return <<<MD
        ## مرحباً بك في وحدة «{$sectionTitle}»

        في هذه الوحدة سنتعرّف على الأفكار الأساسية، ثم نطبّقها على أمثلة متدرّجة الصعوبة.

        **ما الذي ستتعلمه؟**

        - الفكرة الرئيسية للوحدة وكيف تظهر في الاختبار.
        - طريقة حل مختصرة توفّر عليك الوقت.
        - أكثر الأخطاء شيوعاً وكيف تتفاداها.

        ابدأ بالدرس التالي عندما تكون جاهزاً.
        MD;
    }
}
