/*
 * Copyright 2016 Palantir Technologies, Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import { spy } from "sinon";

import { FolderClose } from "@blueprintjs/icons";

import { Breadcrumb, Classes, Icon } from "../../src";

describe("Breadcrumb", () => {
    it("renders its contents", () => {
        render(<Breadcrumb className="foo" text="Hello" />);
        
        const breadcrumbElement = screen.getByText("Hello");
        expect(breadcrumbElement).toBeInTheDocument();
        expect(breadcrumbElement.closest(`.${Classes.BREADCRUMB}`)).toHaveClass("foo");
        expect(breadcrumbElement).toHaveTextContent("Hello");
    });

    it("clicking triggers onClick", async () => {
        const onClick = spy();
        render(<Breadcrumb onClick={onClick} text="Hello" />);
        
        const user = userEvent.setup();
        await user.click(screen.getByText("Hello"));
        
        expect(onClick.calledOnce).toBe(true);
    });

    it("clicking disabled does not trigger onClick", async () => {
        const onClick = spy();
        render(<Breadcrumb disabled={true} onClick={onClick} text="Hello" />);
        
        const user = userEvent.setup();
        await user.click(screen.getByText("Hello"));
        
        expect(onClick.notCalled).toBe(true);
    });

    it("renders an a tag if it's clickable", () => {
        render(<Breadcrumb href="test" />);
        expect(document.querySelector("a")).toBeInTheDocument();
        expect(document.querySelector("span")).not.toBeInTheDocument();
    });

    it("renders a span tag if it's not clickable", () => {
        render(<Breadcrumb />);
        expect(document.querySelector("a")).not.toBeInTheDocument();
        expect(document.querySelector("span")).toBeInTheDocument();
    });

    it("renders an icon if one is provided", () => {
        const { rerender } = render(<Breadcrumb />);
        expect(document.querySelector(`.${Classes.ICON}`)).not.toBeInTheDocument();
        
        rerender(<Breadcrumb icon={<FolderClose />} />);
        expect(document.querySelector(`.${Classes.ICON}`)).toBeInTheDocument();
    });
});
