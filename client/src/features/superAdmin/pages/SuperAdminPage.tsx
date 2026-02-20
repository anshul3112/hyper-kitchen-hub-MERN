import { useState, useEffect } from "react";

import DashboardHeader from "../../../common/components/DashboardHeader";
import { createTenant, fetchTenants, type Tenant } from "../api";

export default function SuperAdminPage() {
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>("");

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchTenants();
      setTenants(res.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred while fetching tenants");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleAddTenant = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError("");

    try {
      await createTenant({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      });

      setFormData({ name: "", email: "", phone: "", address: "" });
      setIsModalOpen(false);
      loadTenants();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const openModal = () => {
    setFormData({ name: "", email: "", phone: "", address: "" });
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ name: "", email: "", phone: "", address: "" });
    setFormError("");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader
        title="Super Admin Dashboard"
        subtitle="Manage your entire organization"
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Navigation Tabs */}
        <div className="mb-8 flex gap-4 border-b border-gray-200">
          <button
            onClick={() => setActiveSection("overview")}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${
              activeSection === "overview"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveSection("tenants")}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${
              activeSection === "tenants"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Tenants
          </button>
          <button
            onClick={() => setActiveSection("users")}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${
              activeSection === "users"
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Users
          </button>
        </div>

        {/* Overview Section */}
        {activeSection === "overview" && (
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-6">
              System Overview
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Total Tenants
                </h3>
                <p className="text-3xl font-bold text-blue-600">
                  {loading ? "..." : tenants.length}
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Total Outlets
                </h3>
                <p className="text-3xl font-bold text-blue-600">45</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-sm font-medium text-gray-600 mb-2">
                  Active Users
                </h3>
                <p className="text-3xl font-bold text-blue-600">328</p>
              </div>
            </div>
          </div>
        )}

        {/* Tenants Section */}
        {activeSection === "tenants" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Manage Tenants
              </h2>
              <button 
                onClick={openModal}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
              >
                Add New Tenant
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8">
                <p className="text-center text-gray-600">Loading tenants...</p>
              </div>
            ) : tenants.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-lg p-8">
                <p className="text-center text-gray-600">No tenants found</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Address
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Created At
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {tenants.map((tenant) => (
                        <tr
                          key={tenant._id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            {tenant.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {tenant.address}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                tenant.status
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {tenant.status ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {new Date(tenant.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Users Section */}
        {activeSection === "users" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Manage Users
              </h2>
              <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors">
                Add New User
              </button>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6 text-center text-gray-600">
                User management interface
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Tenant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-800">
                Add New Tenant
              </h3>
            </div>

            <form onSubmit={handleAddTenant} className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-red-600 text-sm">{formError}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    required
                    disabled={formLoading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    disabled={formLoading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="phone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Phone
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    disabled={formLoading}
                  />
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    required
                    disabled={formLoading}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                  disabled={formLoading}
                >
                  {formLoading ? "Adding..." : "Add Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
