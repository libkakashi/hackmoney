'use client';

import * as React from 'react';
import {format, setHours, setMinutes} from 'date-fns';
import {CalendarIcon, Clock} from 'lucide-react';

import {cn} from '~/lib/utils';
import {Button} from '~/components/ui/button';
import {Calendar} from '~/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '~/components/ui/popover';
import {ScrollArea} from '~/components/ui/scroll-area';

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  minDate?: Date;
  placeholder?: string;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  minDate,
  placeholder = 'Pick date and time',
  className,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    value,
  );

  const hours = Array.from({length: 12}, (_, i) => i + 1);
  const minutes = Array.from({length: 12}, (_, i) => i * 5);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    const newDate = selectedDate
      ? new Date(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
          selectedDate.getHours(),
          selectedDate.getMinutes(),
        )
      : setHours(setMinutes(date, 0), 12);
    setSelectedDate(newDate);
    onChange?.(newDate);
  };

  const handleTimeChange = (
    type: 'hour' | 'minute' | 'ampm',
    val: string | number,
  ) => {
    const current = selectedDate || new Date();
    let newDate = new Date(current);

    if (type === 'hour') {
      const hour = Number(val);
      const isPM = current.getHours() >= 12;
      newDate = setHours(newDate, isPM ? (hour % 12) + 12 : hour % 12);
    } else if (type === 'minute') {
      newDate = setMinutes(newDate, Number(val));
    } else if (type === 'ampm') {
      const currentHour = current.getHours();
      if (val === 'AM' && currentHour >= 12) {
        newDate = setHours(newDate, currentHour - 12);
      } else if (val === 'PM' && currentHour < 12) {
        newDate = setHours(newDate, currentHour + 12);
      }
    }

    setSelectedDate(newDate);
    onChange?.(newDate);
  };

  const getSelectedHour = () => {
    if (!selectedDate) return null;
    const hour = selectedDate.getHours() % 12;
    return hour === 0 ? 12 : hour;
  };

  const getSelectedMinute = () => {
    if (!selectedDate) return null;
    return selectedDate.getMinutes();
  };

  const getSelectedAmPm = () => {
    if (!selectedDate) return null;
    return selectedDate.getHours() >= 12 ? 'PM' : 'AM';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !selectedDate && 'text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? (
            format(selectedDate, 'PPP p')
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="sm:flex">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={date => (minDate ? date < minDate : false)}
            initialFocus
          />
          <div className="flex flex-col sm:flex-row sm:h-[300px] divide-y sm:divide-y-0 sm:divide-x">
            {/* Hours */}
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                <div className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground sm:hidden">
                  <Clock className="h-3 w-3" />
                  Time
                </div>
                {hours.map(hour => (
                  <Button
                    key={hour}
                    size="icon"
                    variant={getSelectedHour() === hour ? 'default' : 'ghost'}
                    className="sm:w-full shrink-0 aspect-square"
                    onClick={() => handleTimeChange('hour', hour)}
                  >
                    {hour}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            {/* Minutes */}
            <ScrollArea className="w-64 sm:w-auto">
              <div className="flex sm:flex-col p-2">
                {minutes.map(minute => (
                  <Button
                    key={minute}
                    size="icon"
                    variant={
                      getSelectedMinute() === minute ? 'default' : 'ghost'
                    }
                    className="sm:w-full shrink-0 aspect-square"
                    onClick={() => handleTimeChange('minute', minute)}
                  >
                    {minute.toString().padStart(2, '0')}
                  </Button>
                ))}
              </div>
            </ScrollArea>
            {/* AM/PM */}
            <div className="flex sm:flex-col p-2">
              {['AM', 'PM'].map(ampm => (
                <Button
                  key={ampm}
                  size="icon"
                  variant={getSelectedAmPm() === ampm ? 'default' : 'ghost'}
                  className="sm:w-full shrink-0 aspect-square"
                  onClick={() => handleTimeChange('ampm', ampm)}
                >
                  {ampm}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
