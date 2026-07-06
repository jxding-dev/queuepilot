// Drag-and-drop + file-picker CSV upload. Rejects non-.csv files with a clear
// message and shows a parsing / error state.

import { useRef, useState } from 'react';
import { useStore, useCopy } from '../state/store';

function isCsvFile(file: File): boolean {
  return /\.csv$/i.test(file.name) || file.type === 'text/csv';
}

export function CsvDropzone() {
  const copy = useCopy();
  const parseFile = useStore((s) => s.parseFile);
  const isParsing = useStore((s) => s.isParsing);
  const parseError = useStore((s) => s.parseError);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rejectMessage, setRejectMessage] = useState<string | null>(null);

  function handleFile(file: File | undefined) {
    setRejectMessage(null);
    if (!file) return;
    if (!isCsvFile(file)) {
      setRejectMessage(copy.upload.notCsv(file.name));
      return;
    }
    void parseFile(file);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  const error = rejectMessage ?? parseError;

  return (
    <div>
      <div
        className={'dropzone' + (isDragging ? ' dropzone--drag' : '')}
        role="button"
        tabIndex={0}
        aria-label={copy.upload.dropAriaLabel}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="dropzone__input"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />
        {isParsing ? (
          <p className="dropzone__title">{copy.upload.reading}</p>
        ) : (
          <>
            <p className="dropzone__title">{copy.upload.dropTitle}</p>
            <p className="dropzone__hint">
              {copy.upload.dropHintPrefix}
              <span className="dropzone__link">{copy.upload.dropHintLink}</span>
              {copy.upload.dropHintSuffix}
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="dropzone__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
