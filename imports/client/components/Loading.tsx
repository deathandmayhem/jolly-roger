import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

export default React.memo(() => {
  return (
    <div className="loading">
      <FontAwesomeIcon icon={faSpinner} color="#aaa" size="3x" pulse />
    </div>
  );
});
