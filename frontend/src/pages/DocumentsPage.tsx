import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as documentsApi from '../api/documents'
import * as tenantsApi from '../api/tenants'
import type { Document } from '../api/documents'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { extractErrorMessage } from '../lib/errors'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function DocumentsPage() {
  const queryClient = useQueryClient()
  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: documentsApi.listDocuments,
  })
  const { data: tenants } = useQuery({ queryKey: ['tenants'], queryFn: tenantsApi.listTenants })

  const tenantById = useMemo(() => new Map(tenants?.map((t) => [t.id, t])), [tenants])

  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['documents'] })

  const uploadMutation = useMutation({
    mutationFn: ({ tenantId, file }: { tenantId: string; file: File }) =>
      documentsApi.uploadDocument(tenantId, file),
    onSuccess: () => {
      invalidate()
      setSelectedTenantId('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    onError: (err) => setUploadError(extractErrorMessage(err)),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.deleteDocument(id),
    onSuccess: invalidate,
  })

  function handleUpload(event: React.FormEvent) {
    event.preventDefault()
    setUploadError(null)
    const file = fileInputRef.current?.files?.[0]
    if (!selectedTenantId || !file) {
      setUploadError('Sélectionne un locataire et un fichier.')
      return
    }
    uploadMutation.mutate({ tenantId: selectedTenantId, file })
  }

  async function handleDownload(document: Document) {
    if (!document.id) return
    setDownloadingId(document.id)
    try {
      const blob = await documentsApi.downloadDocument(document.id)
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.fileName
      link.click()
      URL.revokeObjectURL(url)
    } finally {
      setDownloadingId(null)
    }
  }

  const noTenants = (tenants?.length ?? 0) === 0

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
      <p className="mt-1 text-sm text-slate-500">
        Documents d'identité des locataires. Formats acceptés : PDF, JPEG, PNG (10 Mo max).
      </p>

      <Card className="mt-6 p-6">
        {noTenants ? (
          <p className="text-sm text-slate-500">
            Il faut au moins un locataire enregistré pour uploader un document.
          </p>
        ) : (
          <form onSubmit={handleUpload} className="flex flex-col gap-4">
            {uploadError && <ErrorBanner message={uploadError} />}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="tenantId" className="text-sm font-medium text-slate-700">
                  Locataire
                </label>
                <select
                  id="tenantId"
                  required
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                >
                  <option value="" disabled>
                    Sélectionner un locataire
                  </option>
                  {tenants?.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="file" className="text-sm font-medium text-slate-700">
                  Fichier
                </label>
                <input
                  ref={fileInputRef}
                  id="file"
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  required
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-900 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-sm"
                />
              </div>
            </div>
            <Button type="submit" disabled={uploadMutation.isPending} className="self-start">
              {uploadMutation.isPending ? 'Envoi…' : 'Uploader'}
            </Button>
          </form>
        )}
      </Card>

      <Card className="mt-6 overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Chargement…</p>}
        {error && <div className="p-6"><ErrorBanner message={extractErrorMessage(error)} /></div>}
        {documents && documents.length === 0 && (
          <p className="p-6 text-sm text-slate-500">Aucun document enregistré pour l'instant.</p>
        )}
        {documents && documents.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Locataire</th>
                <th className="px-6 py-3 font-medium">Fichier</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Taille</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((document) => {
                const tenant = document.tenantId ? tenantById.get(document.tenantId) : undefined
                return (
                  <tr key={document.id}>
                    <td className="px-6 py-3 text-slate-900">
                      {tenant ? `${tenant.firstName} ${tenant.lastName}` : '—'}
                    </td>
                    <td className="px-6 py-3 text-slate-600">{document.fileName}</td>
                    <td className="px-6 py-3 text-slate-600">{document.contentType}</td>
                    <td className="px-6 py-3 text-slate-600">{formatSize(document.sizeBytes)}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleDownload(document)}
                        disabled={downloadingId === document.id}
                        className="mr-4 text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:opacity-50"
                      >
                        {downloadingId === document.id ? 'Téléchargement…' : 'Télécharger'}
                      </button>
                      <button
                        onClick={() => document.id && deleteMutation.mutate(document.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
