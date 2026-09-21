import { StackAdvisorForm } from "./stack-advisor-form";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Project Planner</h1>
        <p className="text-sm text-gray-500">
          Answer a few questions about your project and get a ranked tech
          stack recommendation, with reasons attached to every point.
        </p>
      </div>
      <StackAdvisorForm />
    </main>
  );
}
