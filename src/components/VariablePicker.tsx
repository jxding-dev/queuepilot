// One chip per CSV column. Clicking a chip inserts {{column}} at the cursor of
// the last-focused builder input (insertion logic lives in RequestBuilder).
//
// onMouseDown -> preventDefault keeps focus (and the text selection) in the input
// so the caret position is still valid when onClick fires.

import { copy } from '../constants/copy';

interface VariablePickerProps {
  columns: string[];
  onInsert: (token: string) => void;
}

export function VariablePicker({ columns, onInsert }: VariablePickerProps) {
  return (
    <div className="varpicker">
      <div className="varpicker__head">
        <span className="varpicker__title">{copy.build.variablePickerTitle}</span>
        <span className="varpicker__hint">{copy.build.variablePickerHint}</span>
      </div>
      <div className="varpicker__chips">
        {columns.map((col) => (
          <button
            key={col}
            type="button"
            className="chip"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onInsert(col)}
          >
            {col}
          </button>
        ))}
      </div>
    </div>
  );
}
