import React from 'react'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const Switch: React.FC<SwitchProps> = ({ 
  checked, 
  onChange, 
  label, 
  disabled = false,
  size = 'md' 
}) => {
  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6',
    lg: 'w-14 h-7'
  }

  const thumbSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const translateClasses = {
    sm: checked ? 'translate-x-4' : 'translate-x-0.5',
    md: checked ? 'translate-x-5' : 'translate-x-0.5',
    lg: checked ? 'translate-x-7' : 'translate-x-0.5'
  }

  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        className={`
          ${sizeClasses[size]}
          relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
          transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          ${checked 
            ? 'bg-primary-600' 
            : 'bg-gray-200 dark:bg-gray-700'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        role="switch"
        aria-checked={checked}
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
      >
        <span
          aria-hidden="true"
          className={`
            ${thumbSizeClasses[size]}
            ${translateClasses[size]}
            pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 
            transition duration-200 ease-in-out
          `}
        />
      </button>
      
      {label && (
        <span className={`text-sm font-medium ${
          disabled 
            ? 'text-gray-400 dark:text-gray-500' 
            : 'text-gray-900 dark:text-gray-100'
        }`}>
          {label}
        </span>
      )}
    </div>
  )
}

export default Switch