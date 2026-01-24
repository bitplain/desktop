import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import {
  EcoPanel,
  EcoForm,
  EcoInput,
  EcoTextarea,
  EcoButton,
  EcoCard,
  EcoCardTitle,
  EcoNotice,
  EcoStat,
  EcoUploadList,
  EcoTaskPane,
  EcoFileGrid,
  EcoAppWindow,
  EcoAppTitlebar,
  EcoChrome,
  EcoMenu,
  EcoMenuItem,
  EcoToolbar,
  EcoToolbarButton,
} from "../index";

describe("eco primitives", () => {
  it("adds data-eco hooks", () => {
    const html = renderToString(
      <EcoChrome>
        <EcoAppWindow>
          <EcoAppTitlebar>Title</EcoAppTitlebar>
          <EcoPanel>
            <EcoCard>
              <EcoCardTitle>Card</EcoCardTitle>
              <EcoForm>
                <EcoInput value="" onChange={() => undefined} />
                <EcoTextarea value="" onChange={() => undefined} />
                <EcoButton type="button">Ok</EcoButton>
              </EcoForm>
              <EcoStat>42</EcoStat>
              <EcoUploadList />
              <EcoTaskPane />
              <EcoFileGrid />
              <EcoNotice>Note</EcoNotice>
            </EcoCard>
          </EcoPanel>
        </EcoAppWindow>
      </EcoChrome>
    );

    expect(html).toContain('data-eco="panel"');
    expect(html).toContain('data-eco="form"');
    expect(html).toContain('data-eco="input"');
    expect(html).toContain('data-eco="textarea"');
    expect(html).toContain('data-eco="button"');
    expect(html).toContain('data-eco="card"');
    expect(html).toContain('data-eco="card-title"');
    expect(html).toContain('data-eco="notice"');
    expect(html).toContain('data-eco="stat"');
    expect(html).toContain('data-eco="upload-list"');
    expect(html).toContain('data-eco="task-pane"');
    expect(html).toContain('data-eco="file-grid"');
    expect(html).toContain('data-eco="app-window"');
    expect(html).toContain('data-eco="app-titlebar"');
    expect(html).toContain('data-eco="chrome"');
  });

  it("renders eco menu and toolbar primitives", () => {
    const menuHtml = renderToString(
      <EcoMenu>
        <EcoMenuItem>Item</EcoMenuItem>
      </EcoMenu>
    );
    expect(menuHtml).toContain('data-eco="menu"');
    expect(menuHtml).toContain('data-eco="menu-item"');

    const toolbarHtml = renderToString(
      <EcoToolbar>
        <EcoToolbarButton>Action</EcoToolbarButton>
      </EcoToolbar>
    );
    expect(toolbarHtml).toContain('data-eco="toolbar"');
    expect(toolbarHtml).toContain('data-eco="toolbar-button"');
  });
});
