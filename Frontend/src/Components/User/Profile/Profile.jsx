import React from "react";
import { Save, LogOut } from "lucide-react";

const Profile = ({ profile, onChange, onSave, saving, onLogout }) => {
  return (
    <div className="space-y-6 max-w-lg" aria-label="Profile">
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 text-white flex items-center justify-center font-semibold text-lg">
            {profile.name.slice(0, 1)}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800">
              {profile.name}
            </span>
            <span className="text-[11px] text-gray-500">Profile Settings</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-600">
            Name
            <input
              value={profile.name}
              onChange={(e) => onChange({ ...profile, name: e.target.value })}
              className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-600">
            Email
            <input
              type="email"
              value={profile.email}
              onChange={(e) => onChange({ ...profile, email: e.target.value })}
              className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-600">
            Phone
            <input
              value={profile.phone}
              onChange={(e) => onChange({ ...profile, phone: e.target.value })}
              className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1 text-[11px] font-medium text-gray-600">
            Password
            <input
              type="password"
              value={profile.password}
              onChange={(e) =>
                onChange({ ...profile, password: e.target.value })
              }
              placeholder="••••••••"
              className="h-9 rounded-md border border-gray-300 px-3 text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
            />
          </label>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onSave}
            disabled={saving}
            className={`flex-1 h-9 rounded-md text-xs font-medium flex items-center justify-center gap-2 ${saving ? "bg-gray-300 text-gray-600" : "bg-green-600 text-white"}`}
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Save size={14} /> Save
              </>
            )}
          </button>
          <button
            onClick={onLogout}
            className="h-9 px-4 rounded-md bg-gray-200 text-gray-700 text-xs font-medium flex items-center gap-2"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>
    </div>
  );
};
export default Profile;
