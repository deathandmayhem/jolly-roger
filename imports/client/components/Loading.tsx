import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import React from 'react';

export default React.memo(({ inline = false }: { inline?: boolean }) => {
  return (
    <div className={classNames('loading', inline ? 'loading-inline' : 'loading-fullsize')}>
      <FontAwesomeIcon icon={faSpinner} color="#aaa" size={inline ? undefined : '3x'} pulse />
    </div>
  );
});
