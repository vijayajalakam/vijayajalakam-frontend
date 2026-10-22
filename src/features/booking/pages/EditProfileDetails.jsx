import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/axiosInstance";
import { X, ChevronDown, Search, Loader } from "lucide-react";
import { selectCurrentUser, updateUser as updateAuthUser } from "../../../store/slices/authSlice";
import Snackbar from "../../../components/shared/Snackbar";
import CustomDropdown from "../../../components/shared/CustomDropdown";

// Country codes list
const COUNTRY_CODES = [
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+1", name: "United States", flag: "🇺🇸" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", name: "United Arab Emirates", flag: "🇦🇪" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", name: "Qatar", flag: "🇶🇦" },
  { code: "+965", name: "Kuwait", flag: "🇰🇼" },
  { code: "+973", name: "Bahrain", flag: "🇧🇭" },
  { code: "+968", name: "Oman", flag: "🇴🇲" },
  { code: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+39", name: "Italy", flag: "🇮🇹" },
  { code: "+34", name: "Spain", flag: "🇪🇸" },
  { code: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+62", name: "Indonesia", flag: "🇮🇩" },
  { code: "+60", name: "Malaysia", flag: "🇲🇾" },
  { code: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "+63", name: "Philippines", flag: "🇵🇭" },
  { code: "+66", name: "Thailand", flag: "🇹🇭" },
  { code: "+84", name: "Vietnam", flag: "🇻🇳" },
  { code: "+880", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+92", name: "Pakistan", flag: "🇵🇰" },
  { code: "+94", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "+977", name: "Nepal", flag: "🇳🇵" },
  { code: "+98", name: "Iran", flag: "🇮🇷" },
  { code: "+964", name: "Iraq", flag: "🇮🇶" },
  { code: "+353", name: "Ireland", flag: "🇮🇪" },
  { code: "+972", name: "Israel", flag: "🇮🇱" },
  { code: "+1 876", name: "Jamaica", flag: "🇯🇲" },
  { code: "+962", name: "Jordan", flag: "🇯🇴" },
  { code: "+254", name: "Kenya", flag: "🇰🇪" },
  { code: "+961", name: "Lebanon", flag: "🇱🇧" },
  { code: "+52", name: "Mexico", flag: "🇲🇽" },
  { code: "+31", name: "Netherlands", flag: "🇳🇱" },
  { code: "+64", name: "New Zealand", flag: "🇳🇿" },
  { code: "+47", name: "Norway", flag: "🇳🇴" },
  { code: "+48", name: "Poland", flag: "🇵🇱" },
  { code: "+351", name: "Portugal", flag: "🇵🇹" },
  { code: "+40", name: "Romania", flag: "🇷🇴" },
  { code: "+46", name: "Sweden", flag: "🇸🇪" },
  { code: "+41", name: "Switzerland", flag: "🇨🇭" },
  { code: "+90", name: "Turkey", flag: "🇹🇷" },
  { code: "+380", name: "Ukraine", flag: "🇺🇦" },
  { code: "+1", name: "Canada", flag: "🇨🇦" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Country Picker as a separate component with its own scroll state
const CountryPickerScreen = ({ countryCode, onSelect, onClose, filteredCountries, countrySearch, setCountrySearch }) => {
  const [pickerScrolled, setPickerScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setPickerScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-dark-surface">
      {/* Sticky App Bar */}
      <div
        className="sticky top-0 z-20 bg-white dark:bg-dark-surface transition-shadow duration-200"
        style={{ boxShadow: pickerScrolled ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}
      >
        <div className="flex items-center justify-between px-4 h-[56px]">
          <span
            className="text-[15px] font-semibold text-black dark:text-white transition-opacity duration-200"
            style={{ opacity: pickerScrolled ? 1 : 0 }}
          >
            Country/region
          </span>
          <button
            onClick={onClose}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
          >
            <X size={20} className="text-black dark:text-white" />
          </button>
        </div>
      </div>

      <div className="px-4 pb-4">
        <h1 className="text-[22px] font-bold text-black dark:text-white mb-4">Country/region</h1>
        {/* Search */}
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ border: "1.5px solid #e0e0e0" }}
        >
          <Search size={18} className="text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            placeholder="Search by country/region"
            className="flex-1 text-[14px] text-gray-800 dark:text-gray-100 bg-transparent focus:outline-none placeholder-gray-400"
            autoFocus
          />
        </div>
      </div>

      {/* Country List */}
      <div className="px-4 pb-8">
        {filteredCountries.map((country, idx) => (
          <button
            key={`${country.code}-${country.name}-${idx}`}
            onClick={() => onSelect(country.code)}
            className="w-full flex items-center justify-between py-4 text-left"
            style={{ borderBottom: "1px solid #f5f5f5" }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-medium text-gray-400 dark:text-gray-500 w-[28px]">
                {country.flag}
              </span>
              <span className="text-[14px] font-medium text-black dark:text-white">
                {country.name} ({country.code})
              </span>
            </div>
            {/* Radio */}
            <div
              className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                border: countryCode === country.code ? "none" : "2px solid #d1d5db",
                backgroundColor: countryCode === country.code ? "#6366f1" : "transparent",
              }}
            >
              {countryCode === country.code && (
                <div className="w-[8px] h-[8px] rounded-full bg-white dark:bg-dark-surface" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

const EditProfileDetails = () => {
  const { shopSlug } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [snack, setSnack] = useState({ message: "", type: "success" });

  const showSnack = (message, type = "success") => setSnack({ message, type });

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (currentUser) {
      const nameParts = (currentUser.name || "").trim().split(" ");
      setFirstName(nameParts[0] || "");
      setLastName(nameParts.slice(1).join(" ") || "");
      setCountryCode(currentUser.countryCode || "+91");
      setPhone(currentUser.phone || "");
      setEmail(currentUser.email || "");
      setGender(currentUser.gender || "");

      if (currentUser.dateOfBirth) {
        const d = new Date(currentUser.dateOfBirth);
        setDobDay(String(d.getDate()));
        setDobMonth(MONTHS[d.getMonth()]);
        setDobYear(String(d.getFullYear()));
      }
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!firstName.trim()) {
      showSnack("First name is required", "error");
      return;
    }
    setLoading(true);
    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();

      let dateOfBirth = null;
      if (dobDay && dobMonth && dobYear) {
        const monthIdx = MONTHS.indexOf(dobMonth);
        if (monthIdx >= 0) {
          dateOfBirth = new Date(Number(dobYear), monthIdx, Number(dobDay)).toISOString();
        }
      }

      const res = await api.put("/user/profile", {
        name: fullName,
        phone: phone.trim(),
        countryCode,
        gender: gender || undefined,
        dateOfBirth,
        addresses: currentUser.addresses || [],
      });

      if (res.data.success) {
        dispatch(updateAuthUser(res.data.data));
        showSnack("Profile updated successfully");
        setTimeout(() => navigate(-1), 400);
      }
    } catch (err) {
      showSnack(err.response?.data?.message || "Failed to update", "error");
    } finally {
      setLoading(false);
    }
  };

  const filteredCountries = COUNTRY_CODES.filter((c) => {
    const q = countrySearch.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.includes(q);
  });

  if (!currentUser) return null;

  // Country Picker Full Screen
  if (showCountryPicker) {
    return (
      <CountryPickerScreen
        countryCode={countryCode}
        onSelect={(code) => {
          setCountryCode(code);
          setShowCountryPicker(false);
          setCountrySearch("");
        }}
        onClose={() => { setShowCountryPicker(false); setCountrySearch(""); }}
        filteredCountries={filteredCountries}
        countrySearch={countrySearch}
        setCountrySearch={setCountrySearch}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-dark-surface flex flex-col">
      {/* App Bar - shows title on scroll */}
      <div
        className="sticky top-0 z-20 bg-white dark:bg-dark-surface transition-shadow duration-200"
        style={{ boxShadow: isScrolled ? "0 1px 3px rgba(0,0,0,0.06)" : "none" }}
      >
        <div className="flex items-center justify-between px-5 h-[56px]">
          <span
            className="text-[15px] font-semibold text-black dark:text-white transition-opacity duration-200"
            style={{ opacity: isScrolled ? 1 : 0 }}
          >
            Edit profile details
          </span>
          <button
            onClick={() => navigate(-1)}
            className="w-[36px] h-[36px] flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-dark-card dark:bg-dark-card"
          >
            <X size={20} className="text-black dark:text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 pb-32">
        <h1 className="text-[22px] font-bold text-black dark:text-white mb-6">Edit profile details</h1>

        {/* First name */}
        <div className="mb-5">
          <label className="text-[13px] font-semibold text-black dark:text-white block mb-2">First name</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-4 py-4 rounded-2xl text-[15px] text-gray-800 dark:text-gray-100 bg-white dark:bg-dark-surface focus:outline-none transition-colors"
            style={{ border: "1.5px solid #e8e8e8" }}
            placeholder="First name"
          />
        </div>

        {/* Last name */}
        <div className="mb-5">
          <label className="text-[13px] font-semibold text-black dark:text-white block mb-2">Last name</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-4 py-4 rounded-2xl text-[15px] text-gray-800 dark:text-gray-100 bg-white dark:bg-dark-surface focus:outline-none transition-colors"
            style={{ border: "1.5px solid #e8e8e8" }}
            placeholder="Last name"
          />
        </div>

        {/* Mobile number */}
        <div className="mb-5">
          <label className="text-[13px] font-semibold text-black dark:text-white block mb-2">Mobile number</label>
          <div className="flex gap-2">
            {/* Country code picker */}
            <button
              type="button"
              onClick={() => setShowCountryPicker(true)}
              className="flex items-center gap-1 px-3 py-4 rounded-2xl text-[14px] font-medium text-black dark:text-white bg-white dark:bg-dark-surface flex-shrink-0"
              style={{ border: "1.5px solid #e8e8e8" }}
            >
              <span>{countryCode}</span>
              <ChevronDown size={12} className="text-gray-400 dark:text-gray-500" />
            </button>
            {/* Phone input */}
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 min-w-0 px-4 py-4 rounded-2xl text-[15px] text-gray-800 dark:text-gray-100 bg-white dark:bg-dark-surface focus:outline-none transition-colors"
              style={{ border: "1.5px solid #e8e8e8" }}
              placeholder="Phone number"
            />
          </div>
        </div>

        {/* Email */}
        <div className="mb-5">
          <label className="text-[13px] font-semibold text-black dark:text-white block mb-2">Email address</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full px-4 py-4 rounded-2xl text-[15px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark-card cursor-not-allowed"
            style={{ border: "1.5px solid #f0f0f0" }}
          />
        </div>

        {/* Date of birth */}
        <div className="mb-5">
          <label className="text-[13px] font-semibold text-black dark:text-white block mb-2">Date of birth</label>
          <div className="flex gap-2 items-stretch">
            <input
              type="text"
              value={dobDay}
              onChange={(e) => setDobDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
              className="w-[70px] flex-shrink-0 px-3 py-4 rounded-2xl text-[14px] text-gray-800 dark:text-gray-100 bg-white dark:bg-dark-surface focus:outline-none text-center"
              style={{ border: "1.5px solid #e8e8e8" }}
              placeholder="Day"
            />
            <div className="flex-1 min-w-0">
              <CustomDropdown
                value={dobMonth}
                onChange={(e) => setDobMonth(e.target.value)}
                options={MONTHS.map((m) => ({ value: m, label: m.slice(0, 3) }))}
                placeholder="Mon..."
                buttonClassName="w-full flex items-center justify-between min-w-0 bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-sm font-medium outline-none transition-all duration-200 px-4 py-4 rounded-2xl"
                buttonStyle={{ border: "1.5px solid #e8e8e8" }}
              />
            </div>
            <input
              type="text"
              value={dobYear}
              onChange={(e) => setDobYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              className="w-[80px] flex-shrink-0 px-3 py-4 rounded-2xl text-[14px] text-gray-800 dark:text-gray-100 bg-white dark:bg-dark-surface focus:outline-none text-center"
              style={{ border: "1.5px solid #e8e8e8" }}
              placeholder="Year"
            />
          </div>
        </div>

        {/* Gender */}
        <div className="mb-5">
          <CustomDropdown
            label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            options={[
              { value: "Male", label: "Male" },
              { value: "Female", label: "Female" },
              { value: "Other", label: "Other" },
            ]}
            placeholder="Select option"
            buttonClassName="w-full flex items-center justify-between min-w-0 bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-sm font-medium outline-none transition-all duration-200 px-4 py-4 rounded-2xl"
            buttonStyle={{ border: "1.5px solid #e8e8e8" }}
          />
        </div>
      </div>

      {/* Fixed Save Button */}
      <div
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-dark-surface px-5 py-4 z-30"
        style={{ boxShadow: "0 -1px 6px rgba(0,0,0,0.04)" }}
      >
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="w-full py-4 rounded-full text-[15px] font-semibold text-white transition-all disabled:opacity-50 active:scale-[0.98]"
          style={{ backgroundColor: "#111" }}
        >
          {loading ? <Loader size={18} className="animate-spin mx-auto" /> : "Save"}
        </button>
      </div>

      <Snackbar message={snack.message} type={snack.type} onClose={() => setSnack({ ...snack, message: "" })} />
    </div>
  );
};

export default EditProfileDetails;
