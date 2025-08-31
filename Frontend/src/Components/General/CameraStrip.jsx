import React from 'react';
import CameraCard from './CameraCard';

const CameraStrip = ({ cameras, onSelect }) => {
  return (
    <div className="w-full bg-white border-t border-gray-200 shadow-inner overflow-x-auto">
      <div className="flex gap-3 px-3 py-3 w-max">
        {cameras.map(c => <CameraCard key={c.id} camera={c} onClick={onSelect} />)}
      </div>
    </div>
  );
};

export default CameraStrip;
