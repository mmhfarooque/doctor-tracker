import { initials } from '../../lib/format';

// Deterministic, calm tint per name so the same person always gets the same colour.
const TINTS = [
  'bg-pine-100 text-pine-800',
  'bg-[#E5EDFB] text-[#24509E]',
  'bg-[#F3E8F7] text-[#6B3483]',
  'bg-[#FBF0D9] text-[#7A4E00]',
  'bg-[#E6F2F5] text-[#1F5A68]',
  'bg-[#F7E9E4] text-[#8A3B22]',
];

export default function Avatar({ name = '', size = 'md', className = '' }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl' };
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${TINTS[hash % TINTS.length]} ${sizes[size]} ${className}`}
      aria-hidden="true"
    >
      {initials(name) || '?'}
    </span>
  );
}
