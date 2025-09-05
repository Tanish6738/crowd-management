import React from 'react';
import CameraCard from './CameraCard';

const CameraStrip = ({ cameras, onSelect }) => {
  return (
  <div className="w-full mt-4 rounded-xl border mk-divider mk-surface-alt backdrop-blur-xl overflow-x-auto shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] theme-dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
      <div className="flex gap-4 px-4 py-4 w-max">
        {cameras.map(c => <CameraCard key={c.id} camera={c} onClick={onSelect} />)}
      </div>
    </div>
  );
};

export default CameraStrip;
