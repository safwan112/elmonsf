import { RichText } from '@/components/common/rich-text'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import type { Faq } from '@/types/catalog'

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <Accordion type="single" collapsible className="rounded-2xl border bg-card px-5">
      {faqs.map((faq) => (
        <AccordionItem key={faq.id} value={String(faq.id)}>
          <AccordionTrigger>{faq.question}</AccordionTrigger>
          <AccordionContent>
            <RichText html={faq.answer_html} className="text-muted-foreground" />
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
