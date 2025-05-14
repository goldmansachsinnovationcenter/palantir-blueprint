/* !
 * (c) Copyright 2025 Palantir Technologies Inc. All rights reserved.
 */

import classNames from "classnames";
import * as React from "react";

export const Slot = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement> & { children?: React.ReactNode }>(
    function Slot({ children, ...props }, ref) {
        if (React.isValidElement(children)) {
            return React.cloneElement(children, {
                ...props,
                ...children.props,
                className: classNames(props.className, children.props.className),
                ref,
                style: {
                    ...props.style,
                    ...children.props.style,
                },
            });
        }
        if (React.Children.count(children) > 1) {
            throw new TypeError("Only single element child is allowed in Slot");
        }
        return null;
    },
);
