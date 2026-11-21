import React, { useId, useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';

export interface ImageDropzoneProps {
  /** vd. "image/jpeg,image/png,image/webp" */
  accept: string;
  maxBytes: number;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  hint?: React.ReactNode;
  label?: string;
  disabled?: boolean;
  /** Báo lỗi kiểm ở client (loại/dung lượng). Server vẫn là nơi quyết định. */
  onReject?: (messages: string[]) => void;
}

const mb = (bytes: number) => `${Math.round((bytes / 1024 / 1024) * 10) / 10} MB`;

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({ accept, maxBytes, multiple = false, onFiles, hint, label = 'Kéo thả ảnh vào đây hoặc bấm để chọn', disabled, onReject }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const hintId = useId();
  const types = accept.split(',').map((t) => t.trim()).filter(Boolean);

  const handle = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(list).slice(0, multiple ? undefined : 1)) {
      if (types.length && !types.includes(file.type)) rejected.push(`${file.name}: định dạng không được hỗ trợ.`);
      else if (file.size > maxBytes) rejected.push(`${file.name}: vượt quá ${mb(maxBytes)}.`);
      else accepted.push(file);
    }
    setErrors(rejected);
    if (rejected.length) onReject?.(rejected);
    if (accepted.length) onFiles(accepted);
  };

  return (
    <div>
      <button
        type="button"
        className={`hgbo-drop ${drag ? 'is-drag' : ''}`.trim()}
        disabled={disabled}
        aria-describedby={hint ? hintId : undefined}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDrag(false);
          if (!disabled) handle(event.dataTransfer.files);
        }}
      >
        <ImagePlus aria-hidden="true" />
        <b>{label}</b>
        {hint && <span className="hgbo-drop__hint" id={hintId}>{hint}</span>}
      </button>
      <input
        ref={inputRef}
        type="file"
        className="hgbo-sr"
        tabIndex={-1}
        aria-hidden="true"
        accept={accept}
        multiple={multiple}
        onChange={(event) => {
          handle(event.target.files);
          event.target.value = '';
        }}
      />
      {errors.length > 0 && (
        <ul className="hgbo-field__error" role="alert">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
