import { Navigate, createBrowserRouter } from 'react-router-dom';
import { AssistantPage, UnitTestPage } from '../pages';
import { DashboardLayout } from '../layouts/DashboardLayout';


export const menuRoutes = [

  {
    to: "/assistant",
    icon: "fa-solid fa-user",
    title: "Asistente",
    description: "Información del asistente",
    component: <AssistantPage />
  },
  {
    to: "/unit-test",
    icon: "fa-solid fa-user",
    title: "Unit test",
    description: "Información de Unit Test",
    component: <UnitTestPage />
  },
];


export const router = createBrowserRouter([
  {
    path: "/",
    element: <DashboardLayout />,
    children: [
      ...menuRoutes.map(route => ({
        path: route.to,
        element: route.component
      })),
      {
        path: '',
        element: <Navigate to={menuRoutes[0].to} />
      }

    ],
  }
])