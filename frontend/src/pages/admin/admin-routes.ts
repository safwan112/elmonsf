// Lazily loaded admin pages (see routes/router.tsx).
export { AdminOverviewPage } from './admin-overview-page'
export { AdminUsersPage } from './admin-users-page'
export { AdminBroadcastsPage } from './broadcasts-page'
export { AdminCategoriesPage, AdminCouponsPage, AdminInstructorsPage, AdminProductsPage } from './catalog-admin-pages'
export { AdminOrderDetailPage, AdminOrdersPage, AdminPaymentsPage } from './commerce-admin-pages'
export {
  AdminFaqsPage,
  AdminMessagesPage,
  AdminPagesPage,
  AdminPostsPage,
  AdminReviewsPage,
  AdminTestimonialsPage,
} from './content-admin-pages'
export { AdminCourseEditorPage, AdminCoursesPage } from './course-admin-pages'
export { AdminExamEditorPage, AdminExamsPage, AdminQuestionBanksPage, AdminQuestionsPage } from './learning-admin-pages'
export { AdminAuditLogsPage, AdminSettingsPage } from './system-admin-pages'
