interface SlideTitleProps {
  title: string;
}

export function SlideTitle({ title }: SlideTitleProps) {
  return (
    <div className="inline-flex w-fit items-center rounded-md border border-accent-blue/50 bg-accent-blue/10 px-3 py-1.5">
      <p className="text-xs font-semibold uppercase tracking-widest text-accent-blue">{title}</p>
    </div>
  );
}
