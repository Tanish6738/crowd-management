import React from 'react';
import CameraCard from './CameraCard';

const CameraStrip = ({ cameras, onSelect }) => {
  return (
    <div className="w-full mt-4 rounded-xl border mk-divider bg-[rgba(14,32,51,0.6)] backdrop-blur-xl overflow-x-auto shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
      <div className="flex gap-4 px-4 py-4 w-max">
        {cameras.map(c => <CameraCard key={c.id} camera={c} onClick={onSelect} />)}
      </div>
    </div>
  );
};

export default CameraStrip;
