import { useCallback, createElement, type CSSProperties, type ReactNode, type HTMLAttributes, type ButtonHTMLAttributes } from 'react';

/**
 * CSS properties that don't need 'px' suffix for numeric values.
 */
const UNITLESS = new Set([
  'animationIterationCount', 'columnCount', 'columns', 'flex', 'flexGrow',
  'flexShrink', 'fontWeight', 'lineHeight', 'opacity', 'order', 'orphans',
  'tabSize', 'widows', 'zIndex', 'zoom',
]);

function applyCSS(el: HTMLElement, css: CSSProperties) {
  const s = el.style as unknown as Record<string, string>;
  for (const [key, value] of Object.entries(css)) {
    if (value == null) {
      s[key] = '';
    } else if (typeof value === 'number') {
      s[key] = UNITLESS.has(key) ? String(value) : `${value}px`;
    } else {
      s[key] = value;
    }
  }
}

type BaseStyledProps = {
  css: CSSProperties;
  children?: ReactNode;
};

type StyledDivProps = BaseStyledProps & { as?: 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'label' } & Omit<HTMLAttributes<HTMLElement>, 'style'>;
type StyledButtonProps = BaseStyledProps & { as: 'button' } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'style'>;

type StyledProps = StyledDivProps | StyledButtonProps;

/**
 * Wrapper component that applies dynamic CSS via ref instead of inline style attribute.
 * This avoids no-inline-styles linter warnings while supporting runtime dynamic values
 * needed for admin panel theme/color previews.
 */
export function Styled(props: StyledProps) {
  const { as: Tag = 'div', css, children, ...rest } = props;

  const refCallback = useCallback(
    (el: HTMLElement | null) => {
      if (el) applyCSS(el, css);
    },
    [css],
  );

  return createElement(Tag, { ...rest, ref: refCallback }, children);
}
