import { useCallback, useEffect, useRef, useState } from "react"
import { api, type Attachment, type AttachmentAssociationType } from "@/lib/api"
import { Button } from "@/components/ui/button"

interface AttachmentManagerProps {
  associatedType: AttachmentAssociationType
  associatedId: string
}

export function AttachmentManager({ associatedType, associatedId }: AttachmentManagerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const reload = useCallback(() => {
    api.attachments.list(associatedType, associatedId).then(setAttachments)
  }, [associatedType, associatedId])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      await api.attachments.upload(associatedType, associatedId, file)
      reload()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remove this attachment?")) return
    await api.attachments.delete(id)
    reload()
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {attachments.map((a) => (
        <span key={a.id} className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
          <a
            href={api.attachments.downloadUrl(a.id)}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            📎 {a.filename}
          </a>
          <button
            type="button"
            onClick={() => handleDelete(a.id)}
            className="text-muted-foreground hover:text-destructive"
            aria-label={`Remove ${a.filename}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-xs"
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? "Uploading…" : "+ Attach"}
      </Button>
    </div>
  )
}
