import React from 'react';

interface DSMPageSheetProps {
  children: React.ReactNode;
  style?: React.CSSProperties;
}

export default function DSMPageSheet({
  children,
  style,
}: DSMPageSheetProps) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '28px 28px 0 0',
      boxShadow: '0 -12px 28px rgba(0,0,0,0.25)',
      minHeight: '100%',
      flex: 1,
      overflow: 'hidden',
    }}>
      {/* Drag handle */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 12,
        marginBottom: 8,
      }}>
        <div style={{
          width: 40,
          height: 5,
          borderRadius: 3,
          background: '#DADFE5',
        }} />
      </div>

      {/* Content */}
      <div style={style}>
        {children}
      </div>
    </div>
  );
}
