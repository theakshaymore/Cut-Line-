import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

const CustomerRegister = () => {
  const { registerCustomer } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });

  const onChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await registerCustomer(form);
      navigate("/salons");
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <main className="max-w-4xl mx-auto py-10 px-4">
      <div className="grid md:grid-cols-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden">
        <img
          src="https://images.pexels.com/photos/853427/pexels-photo-853427.jpeg"
          alt="Salon registration"
          className="h-full min-h-[260px] object-cover"
        />
        <div className="p-6">
          <h1 className="text-2xl font-bold">Customer Registration</h1>
          <form onSubmit={onSubmit} className="mt-4 space-y-3">
            <input
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded px-3 py-2"
              name="name"
              placeholder="Name"
              value={form.name}
              onChange={onChange}
              required
            />
            <input
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded px-3 py-2"
              name="phone"
              placeholder="Phone"
              value={form.phone}
              onChange={onChange}
              required
            />
            <input
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded px-3 py-2"
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={onChange}
              required
            />
            <input
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 rounded px-3 py-2"
              name="password"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={onChange}
              required
            />
            <button className="w-full bg-brand text-white rounded px-3 py-2">
              Create Account
            </button>
          </form>
        </div>
      </div>
    </main>
  );
};

export default CustomerRegister;
