import { useState } from "react";

function DatePicker({ value, onChange }) {

    const [show, setShow] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());

    const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();

    const handleSelect = (day) => {
        const selected = new Date(
            viewDate.getFullYear(),
            viewDate.getMonth(),
            day
        );
        onChange(selected);
        setShow(false);
    };

    const renderDays = () => {
        const total = daysInMonth(
            viewDate.getFullYear(),
            viewDate.getMonth()
        );

        let days = [];
        for (let i = 1; i <= total; i++) {
            days.push(
                <div
                    key={i}
                    onClick={() => handleSelect(i)}
                    className="p-2 text-center hover:bg-orange-300 rounded-full cursor-pointer"
                >
                    {i}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="relative w-80">

            <input
                readOnly
                onClick={() => setShow(!show)}
                value={
                    value
                        ? value.toLocaleDateString("en-GB")
                        : ""
                }
                placeholder="วัน/เดือน/ปี เกิด"
                className="border px-4 py-2 w-full shadow cursor-pointer"
            />

            {show && (
                <div className="absolute bg-white border shadow-lg mt-2 p-4 rounded-xl z-50">

                    {/* Header */}
                    <div className="flex justify-between mb-2">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewDate(new Date(
                                    viewDate.getFullYear(),
                                    viewDate.getMonth() - 1
                                ));
                            }}
                        >
                            ◀
                        </button>


                        <span>
                            {viewDate.toLocaleString('default', { month: 'long' })}{" "}
                            {viewDate.getFullYear()}
                        </span>

                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setViewDate(new Date(
                                    viewDate.getFullYear(),
                                    viewDate.getMonth() + 1
                                ));
                            }}
                        >
                            ▶
                        </button>
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {renderDays()}
                    </div>

                </div>
            )}
        </div>
    );
}

export default DatePicker;
