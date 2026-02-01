import React, { useState } from 'react'

interface ImageSliderProps {
  images?: string[]
  className?: string
}

const ImageSlider: React.FC<ImageSliderProps> = ({ images = [], className }) => {
  const [selected, setSelected] = useState<number>(0)

  if (!images || images.length === 0) {
    return <div className={className} style={{ minHeight: 120, background: '#f6f6f6' }}>No images</div>
  }

  return (
    <div className={className}>
      <div style={{ textAlign: 'center' }}>
        <img src={images[selected]} alt={`img-${selected}`} style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'cover' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8, overflowX: 'auto', padding: '6px 0' }}>
        {images.map((src, i) => (
          <img
            key={src + i}
            src={src}
            alt={`thumb-${i}`}
            onClick={() => setSelected(i)}
            style={{ width: 64, height: 48, objectFit: 'cover', cursor: 'pointer', border: i === selected ? '2px solid #111' : '1px solid #ddd' }}
          />
        ))}
      </div>
    </div>
  )
}

export default ImageSlider
