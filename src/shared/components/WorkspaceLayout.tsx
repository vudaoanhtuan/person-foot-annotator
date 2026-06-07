import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { Group, Panel, Separator, useDefaultLayout } from "react-resizable-panels";

type SlotKey = "left" | "right" | "main" | "bottom" | "status";

type SideProps = {
  children: ReactNode;
  /** Sizes are in pixels. */
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
};

type SlotProps = SideProps | { children: ReactNode };

type SlotComponent = ((props: SlotProps) => null) & { __slot: SlotKey };

function makeSlot(key: SlotKey, displayName: string): SlotComponent {
  const Slot = (_props: SlotProps) => null;
  Slot.displayName = displayName;
  const tagged = Slot as unknown as SlotComponent;
  tagged.__slot = key;
  return tagged;
}

const LeftSideBar = makeSlot("left", "WorkspaceLayout.LeftSideBar");
const RightSideBar = makeSlot("right", "WorkspaceLayout.RightSideBar");
const Main = makeSlot("main", "WorkspaceLayout.Main");
const BottomSideBar = makeSlot("bottom", "WorkspaceLayout.BottomSideBar");
const StatusBar = makeSlot("status", "WorkspaceLayout.StatusBar");

type SlotElement = ReactElement<SideProps> & { type: SlotComponent };

function pickSlots(children: ReactNode) {
  const slots: Partial<Record<SlotKey, SlotElement>> = {};
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const type = (child as ReactElement).type as Partial<SlotComponent>;
    const key = type?.__slot;
    if (!key) return;
    slots[key] = child as SlotElement;
  });
  return slots;
}

const px = (n: number) => `${n}px`;

// Negative margins collapse the separator to zero layout width so neighboring
// panels touch (no gap); the 4px grab area overlaps them via z-index.
const SEPARATOR_V =
  "relative z-10 w-1 -mx-0.5 bg-transparent hover:bg-blue-400/40 data-[separator=active]:bg-blue-500/60 transition-colors";
const SEPARATOR_H =
  "relative z-10 h-1 -my-0.5 bg-transparent hover:bg-blue-400/40 data-[separator=active]:bg-blue-500/60 transition-colors";

type Props = {
  children: ReactNode;
  className?: string;
  storageKey?: string;
};

function WorkspaceLayout({ children, className, storageKey = "workspace-layout" }: Props) {
  const slots = pickSlots(children);

  const leftCfg = (slots.left?.props ?? {}) as SideProps;
  const rightCfg = (slots.right?.props ?? {}) as SideProps;
  const bottomCfg = (slots.bottom?.props ?? {}) as SideProps;

  const outerLayout = useDefaultLayout({
    id: `${storageKey}:outer`,
    panelIds: slots.left ? ["left", "center"] : ["center"],
  });
  const verticalLayout = useDefaultLayout({
    id: `${storageKey}:vertical`,
    panelIds: slots.bottom ? ["main-row", "bottom"] : ["main-row"],
  });
  const innerLayout = useDefaultLayout({
    id: `${storageKey}:inner`,
    panelIds: slots.right ? ["main", "right"] : ["main"],
  });

  return (
    <div className={`h-full w-full flex flex-col ${className ?? ""}`}>
      <div className="flex-1 min-h-0">
        <Group
          orientation="horizontal"
          defaultLayout={outerLayout.defaultLayout}
          onLayoutChanged={outerLayout.onLayoutChanged}
        >
          {slots.left && (
            <>
              <Panel
                id="left"
                defaultSize={px(leftCfg.defaultSize ?? 256)}
                minSize={px(leftCfg.minSize ?? 160)}
                maxSize={px(leftCfg.maxSize ?? 600)}
                className="flex flex-col"
                style={{ overflow: "hidden" }}
              >
                {slots.left.props.children}
              </Panel>
              <Separator className={SEPARATOR_V} />
            </>
          )}
          <Panel id="center" className="flex flex-col" style={{ overflow: "hidden" }}>
            <Group
              orientation="vertical"
              defaultLayout={verticalLayout.defaultLayout}
              onLayoutChanged={verticalLayout.onLayoutChanged}
            >
              <Panel id="main-row" className="flex flex-col" style={{ overflow: "hidden" }}>
                <Group
                  orientation="horizontal"
                  defaultLayout={innerLayout.defaultLayout}
                  onLayoutChanged={innerLayout.onLayoutChanged}
                >
                  <Panel id="main" className="flex" style={{ overflow: "hidden" }}>
                    {slots.main?.props.children}
                  </Panel>
                  {slots.right && (
                    <>
                      <Separator className={SEPARATOR_V} />
                      <Panel
                        id="right"
                        defaultSize={px(rightCfg.defaultSize ?? 320)}
                        minSize={px(rightCfg.minSize ?? 200)}
                        maxSize={px(rightCfg.maxSize ?? 700)}
                        className="flex flex-col"
                        style={{ overflow: "hidden" }}
                      >
                        {slots.right.props.children}
                      </Panel>
                    </>
                  )}
                </Group>
              </Panel>
              {slots.bottom && (
                <>
                  <Separator className={SEPARATOR_H} />
                  <Panel
                    id="bottom"
                    defaultSize={px(bottomCfg.defaultSize ?? 200)}
                    minSize={px(bottomCfg.minSize ?? 80)}
                    maxSize={px(bottomCfg.maxSize ?? 600)}
                    className="flex flex-col"
                    style={{ overflow: "hidden" }}
                  >
                    {slots.bottom.props.children}
                  </Panel>
                </>
              )}
            </Group>
          </Panel>
        </Group>
      </div>
      {slots.status?.props.children}
    </div>
  );
}

WorkspaceLayout.LeftSideBar = LeftSideBar;
WorkspaceLayout.RightSideBar = RightSideBar;
WorkspaceLayout.Main = Main;
WorkspaceLayout.BottomSideBar = BottomSideBar;
WorkspaceLayout.StatusBar = StatusBar;

export default WorkspaceLayout;
