import { Outlet } from "react-router-dom";

export const DashboardLayout = () => {
  return (
    <main className="mt-7 mx-3 sm:mx-20">
      <section className="w-full min-h-[calc(100vh-50px)] bg-white bg-opacity-10 p-5 rounded-3xl">
        <div className="flex flex-row h-full">
          <div className="flex flex-col flex-auto h-full p-1">
            <Outlet />
          </div>
        </div>
      </section>
    </main>
  );
};