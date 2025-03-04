import React from "react";
import { cn } from "@/lib/utils";
import { Highlight, themes, type Language } from "prism-react-renderer";

interface CodeProps extends Omit<React.HTMLAttributes<HTMLPreElement>, "children"> {
  language?: Language;
  code: string;
  showLineNumbers?: boolean;
}

const Code = React.forwardRef<HTMLPreElement, CodeProps>(
  ({ language = "tsx", code, showLineNumbers = false, className, ...props }, ref) => {
    return (
      <Highlight theme={themes.nightOwl} code={code} language={language}>
        {({ className: _className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            ref={ref}
            className={cn(
              "rounded-md border border-border bg-muted px-4 py-3 font-mono text-sm text-left overflow-auto",
              className
            )}
            style={style}
            {...props}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line, key: i })}>
                {showLineNumbers && (
                  <span className="inline-block w-6 mr-2 text-gray-500 text-right select-none">
                    {i + 1}
                  </span>
                )}
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token, key })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    );
  }
);

Code.displayName = "Code";

export { Code }; 