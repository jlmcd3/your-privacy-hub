import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search } from "lucide-react";

export default function SearchStrip() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (query.trim()) {
      navigate(`/updates?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <div className="bg-paper border-b border-fog">
      <div className="max-w-[1280px] mx-auto px-4 md:px-8">
      </div>
    </div>
  );
}
