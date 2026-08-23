import { api, type Attachment } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface AttachmentPreviewDialogProps {
  attachment: Attachment | null
  onOpenChange: (open: boolean) => void
}

export function AttachmentPreviewDialog({ attachment, onOpenChange }: AttachmentPreviewDialogProps) {
  const canPreview =
    !!attachment && (attachment.content_type.startsWith("image/") || attachment.content_type === "application/pdf")

  return (
    <Dialog open={!!attachment} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{attachment?.filename}</DialogTitle>
        </DialogHeader>
        {attachment && canPreview ? (
          attachment.content_type.startsWith("image/") ? (
            <img
              src={api.attachments.previewUrl(attachment.id)}
              alt={attachment.filename}
              className="max-h-[70vh] w-full rounded-md border object-contain"
            />
          ) : (
            <iframe
              src={api.attachments.previewUrl(attachment.id)}
              title={attachment.filename}
              className="h-[70vh] w-full rounded-md border"
            />
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            Preview isn't available for this file type — download it to view.
          </p>
        )}
        {attachment && (
          <Button asChild variant="outline" size="sm" className="self-start">
            <a href={api.attachments.downloadUrl(attachment.id)}>Download</a>
          </Button>
        )}
      </DialogContent>
    </Dialog>
  )
}
