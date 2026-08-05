import React from 'react';
import { Link } from 'wouter';

export default function LP() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      <Link href="/register" className="w-full max-w-xl">
        <img
          src={`${import.meta.env.BASE_URL}lp-hero.png`}
          alt="Chat LOGI"
          className="w-full"
        />
      </Link>
    </div>
  );
}
