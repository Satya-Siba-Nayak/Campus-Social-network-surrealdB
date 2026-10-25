import React, { useState } from 'react';
import { X, UserPlus, Sparkles } from 'lucide-react';

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
  'Biotech & Bioinformatics',
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

  const computedRecordId =
    (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'new_student';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Campus Student</h2>
              <p className="text-xs text-slate-400">
                Creates a new student node in SurrealDB WASM
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rohan Verma"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-fuchsia-500 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Custom Record ID (Optional)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. rohan"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-fuchsia-500 px-3.5 py-2.5 text-sm font-mono text-fuchsia-300 placeholder-slate-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Branch / Major *
              </label>
              <input
                type="text"
                list="campus-branches"
                required
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. Computer Science"
                className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-fuchsia-500 px-3.5 py-2.5 text-sm text-white focus:outline-none"
              />
              <datalist id="campus-branches">
                {POPULAR_BRANCHES.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Year *
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-fuchsia-500 px-3.5 py-2.5 text-sm text-white focus:outline-none"
              >
                <option value={1}>Year 1 (Freshman)</option>
                <option value={2}>Year 2 (Sophomore)</option>
                <option value={3}>Year 3 (Junior)</option>
                <option value={4}>Year 4 (Senior)</option>
                <option value={5}>Year 5 (Grad / PhD)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Campus Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="What clubs, research labs, or projects are they working on?"
              className="w-full rounded-xl bg-slate-950 border border-slate-800 focus:border-fuchsia-500 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Live SurrealQL Preview */}
          <div className="rounded-xl bg-slate-950/90 border border-slate-800/90 p-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-fuchsia-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              SurrealQL Preview
            </div>
            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
              {`CREATE student:${computedRecordId} SET name = "${name || '...'}", branch = "${branch}", year = ${year}, bio = "${bio || '...'}";`}
            </pre>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white shadow-lg shadow-fuchsia-950/50 transition-all disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              {submitting ? 'Creating...' : 'Create Student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
