import React from 'react';
import NetflixHoverCard from './NetflixHoverCard';

export default function MediaCard({ item, type, onClick, showRemoveButton, onRemove }) {
  return (
    <NetflixHoverCard 
      item={item} 
      type={type} 
      onClickItem={onClick} 
      showRemoveButton={showRemoveButton} 
      onRemove={onRemove} 
    />
  );
}
