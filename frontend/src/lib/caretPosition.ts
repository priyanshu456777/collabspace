// Adapted mirror-div technique for computing the pixel position of a
// character offset inside a <textarea>. There is no native browser API for
// this, so we render an invisible clone of the textarea with the same font
// metrics, insert a marker span at the target offset, and read its
// offsetTop/offsetLeft.
const PROPERTIES = [
  'boxSizing',
  'width',
  'height',
  'overflowX',
  'overflowY',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'fontStyle',
  'fontVariant',
  'fontWeight',
  'fontStretch',
  'fontSize',
  'fontSizeAdjust',
  'lineHeight',
  'fontFamily',
  'textAlign',
  'textTransform',
  'textIndent',
  'textDecoration',
  'letterSpacing',
  'wordSpacing',
  'tabSize',
  'whiteSpace',
  'wordWrap',
];

export function getCaretCoordinates(textarea: HTMLTextAreaElement, position: number) {
  const div = document.createElement('div');
  document.body.appendChild(div);

  const style = div.style;
  const computed = window.getComputedStyle(textarea);

  style.whiteSpace = 'pre-wrap';
  style.wordWrap = 'break-word';
  style.position = 'absolute';
  style.visibility = 'hidden';

  PROPERTIES.forEach((prop) => {
    // @ts-expect-error - dynamic style property assignment across a known-safe property list
    style[prop] = computed[prop];
  });

  style.width = computed.width;

  div.textContent = textarea.value.substring(0, position);
  const span = document.createElement('span');
  span.textContent = textarea.value.substring(position) || '.';
  div.appendChild(span);

  const coordinates = {
    top: span.offsetTop + parseInt(computed.borderTopWidth, 10),
    left: span.offsetLeft + parseInt(computed.borderLeftWidth, 10),
    height: parseInt(computed.lineHeight, 10) || 20,
  };

  document.body.removeChild(div);
  return coordinates;
}
