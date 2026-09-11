import type { ReactNode } from "react";
import { SectionHeader } from "./SectionHeader";

type Props = {
  kicker?: string;
  title: string;
  actions?: ReactNode;
};

export function PageHeader({ kicker, title, actions }: Props) {
  return <SectionHeader kicker={kicker} title={title} action={actions} />;
}
