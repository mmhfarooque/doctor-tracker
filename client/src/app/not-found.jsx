import Link from 'next/link';
import { Compass } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

export const metadata = { title: 'Page not found · Doctor Tracker' };

export default function NotFound() {
  return (
    <div className="panel mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={Compass}
        title="This page doesn’t exist"
        message="The link may be out of date, or the address was mistyped."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/" className="btn btn-primary">
              Go to dashboard
            </Link>
            <Link href="/patients" className="btn btn-secondary">
              Open patients
            </Link>
          </div>
        }
      />
    </div>
  );
}
