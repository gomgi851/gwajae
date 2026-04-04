import { useMemo } from 'react'
import type { AssignmentAsset } from '../../types'
import { getAssignmentAssetPreviewKind } from '../../lib/assignments'
import styles from './AssetPreviewModal.module.css'

interface AssetPreviewModalProps {
  asset: AssignmentAsset
  previewUrl: string
  downloadUrl: string | null
  onClose: () => void
}

function bytesToMegabytes(bytes: number) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10
}

export function AssetPreviewModal({
  asset,
  previewUrl,
  downloadUrl,
  onClose,
}: AssetPreviewModalProps) {
  const previewKind = useMemo(() => getAssignmentAssetPreviewKind(asset), [asset])

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="asset-preview-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={styles.titleBlock}>
            <h2 id="asset-preview-title" className={styles.title}>
              {asset.fileName}
            </h2>
            <p className={styles.meta}>
              {previewKind === 'image' ? '이미지' : 'PDF'} · {bytesToMegabytes(asset.sizeBytes)}MB
            </p>
          </div>
          <div className={styles.actions}>
            {downloadUrl ? (
              <a className={styles.downloadButton} href={downloadUrl} download={asset.fileName}>
                다운로드
              </a>
            ) : null}
            <button className={styles.closeButton} type="button" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </div>
        </header>

        <div className={styles.body}>
          {previewKind === 'pdf' ? (
            <iframe className={styles.frame} src={previewUrl} title={asset.fileName} />
          ) : (
            <div className={styles.imageWrap}>
              <img className={styles.image} src={previewUrl} alt={asset.fileName} />
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
