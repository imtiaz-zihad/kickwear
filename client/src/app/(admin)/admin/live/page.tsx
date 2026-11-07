import LiveVisitors from "./LiveVisitors";
import PageViews from "./PageViews";

export default function LivePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Live &amp; page views</h1>
        <p className="text-muted-foreground">
          Ekhon kara active, ar kon page koto bar dekha hoyeche
        </p>
      </div>

      <div className="max-w-md">
        <LiveVisitors />
      </div>

      <PageViews />
    </div>
  );
}