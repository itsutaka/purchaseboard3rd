import React from 'react';

const Backdrop = ({ onClick }) => <div onClick={onClick} className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden" />;

export default Backdrop;
