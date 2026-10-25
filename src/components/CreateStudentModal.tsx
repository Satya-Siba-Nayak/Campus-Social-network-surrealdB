import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    slug?: string;
    name: string;
    branch: string;
    year: number;
    bio: string;
  }) => Promise<void>;
}

const POPULAR_BRANCHES = [
  'Computer Science',
  'Data Science',
  'Electrical & AI',
  'Cybersecurity',
  'Computational Design',
  'Mechanical & Robotics',
];

export const CreateStudentModal: React.FC<CreateStudentModalProps> = ({
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [branch, setBranch] = useState('Computer Science');
  const [year, setYear] = useState<number>(3);
  const [bio, setBio] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !branch.trim()) return;
    setSubmitting(true);
    try {
      await onCreate({
        slug: slug.trim() || undefined,
        name: name.trim(),
        branch: branch.trim(),
        year,
        bio: bio.trim(),
      });
      setName('');
      setSlug('');
      setBio('');
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-[28px] bg-[#121215] border border-white/[0.08] p-6 sm:p-7 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">New Student</h2>
            <p className="text-[13px] text-zinc-500 mt-0.5">
              Add a student profile to the campus network
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-zinc-500 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohan Verma"
              className="w-full rounded-2xl bg-[#18181c] border border-white/[0.06] focus:border-white/25 px-4 py-3 text-[15px] text-white placeholder-zinc-600 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Branch
              </label>
              <input
                type="text"
                list="campus-branches"
                required
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full rounded-2xl bg-[#18181c] border border-white/[0.06] focus:border-white/25 px-4 py-3 text-[14px] text-white focus:outline-none"
              />
              <datalist id="campus-branches">
                {POPULAR_BRANCHES.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-2xl bg-[#18181c] border border-white/[0.06] focus:border-white/25 px-4 py-3 text-[14px] text-white focus:outline-none"
              >
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
                <option value={4}>Year 4</option>
                <option value={5}>Year 5</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Handle / Record ID <span className="text-zinc-600">(Optional)</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. rohan"
              className="w-full rounded-2xl bg-[#18181c] border border-white/[0.06] focus:border-white/25 px-4 py-3 text-[14px] font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Interests, labs, or projects..."
              className="w-full rounded-2xl bg-[#18181c] border border-white/[0.06] focus:border-white/25 px-4 py-3 text-[14px] text-white placeholder-zinc-600 focus:outline-none resize-none"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-[13px] font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="px-6 py-2.5 rounded-full text-[13px] font-semibold bg-white hover:bg-zinc-200 text-black transition-all disabled:opacity-40"
            >
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
