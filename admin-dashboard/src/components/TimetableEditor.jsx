import React, { useState, useEffect } from 'react';
import api from '../api';

const TimetableEditor = ({ routine, onClose, onUpdate }) => {
    const [timetable, setTimetable] = useState(routine.timetable);
    const [teachers, setTeachers] = useState([]);
    const [editingCell, setEditingCell] = useState(null); // { dayIndex, periodIndex }
    const [cellData, setCellData] = useState({
        subject: '', teacher: '', startTime: '', endTime: '', periodNo: ''
    });

    useEffect(() => {
        const fetchTeachers = async () => {
            try {
                const { data } = await api.get('/admin/users');
                const teacherList = data.filter(u => u.role === 'teacher');
                setTeachers(teacherList);
            } catch (error) {
                console.error("Error fetching teachers", error);
            }
        };
        fetchTeachers();
    }, []);

    const handleCellClick = (dayIndex, periodIndex, periodData) => {
        setEditingCell({ dayIndex, periodIndex });
        setCellData({
            subject: periodData?.subject || '',
            teacher: periodData?.teacher || '',
            startTime: periodData?.startTime || '09:00',
            endTime: periodData?.endTime || '10:00',
            periodNo: periodData?.periodNo || (periodIndex + 1)
        });
    };

    const handleSaveCell = () => {
        const { dayIndex, periodIndex } = editingCell;
        const newTimetable = [...timetable];

        // Ensure periods array exists
        if (!newTimetable[dayIndex].periods) newTimetable[dayIndex].periods = [];

        // Update or Add
        // We are strictly using index for display, but array might be sparse or unsorted in DB.
        // For simplicity, let's assume we just push/update based on periodNo if we want robust, 
        // but here let's just replace the item at that visual index if acceptable, 
        // OR better: match by periodNo.
        // Let's stick to a simple array replace for now since we initialize nicely.

        const updatedPeriod = { ...cellData };

        // If the period exists at this index, update it. If not, we might be adding a new one.
        // The previous implementation initialized empty arrays.
        // Let's assume we want to fill the specific slot.
        // Actually, easiest valid way: 
        // Find existing period with same periodNo or just push if not exists.

        const existingPeriodIndex = newTimetable[dayIndex].periods.findIndex(p => p.periodNo === parseInt(cellData.periodNo));

        if (existingPeriodIndex >= 0) {
            newTimetable[dayIndex].periods[existingPeriodIndex] = updatedPeriod;
        } else {
            newTimetable[dayIndex].periods.push(updatedPeriod);
        }

        // Sort periods by periodNo
        newTimetable[dayIndex].periods.sort((a, b) => a.periodNo - b.periodNo);

        setTimetable(newTimetable);
        setEditingCell(null);
    };

    const saveRoutine = async () => {
        try {
            const { data } = await api.put(`/routines/${routine._id}`, { timetable });
            onUpdate(data);
            onClose();
        } catch (error) {
            alert('Error saving routine');
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center overflow-auto pt-10 pb-10">
            <div className="bg-white p-6 rounded shadow-lg w-11/12 max-w-6xl h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Editing: {routine.dept} - {routine.batch} (Sem {routine.semester})</h2>
                    <button onClick={saveRoutine} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">Save Changes</button>
                    <button onClick={onClose} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 ml-2">Close</button>
                </div>

                <div className="overflow-auto flex-1">
                    <table className="min-w-full border-collapse border border-gray-300">
                        <thead>
                            <tr>
                                <th className="border border-gray-300 p-2 bg-gray-100">Day</th>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                    <th key={num} className="border border-gray-300 p-2 bg-gray-100">Period {num}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timetable.map((daySchedule, dIndex) => (
                                <tr key={daySchedule.day}>
                                    <td className="border border-gray-300 p-2 font-bold bg-gray-50">{daySchedule.day}</td>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map((pNum) => {
                                        const period = daySchedule.periods.find(p => p.periodNo === pNum);
                                        return (
                                            <td
                                                key={pNum}
                                                onClick={() => handleCellClick(dIndex, pNum - 1, { ...period, periodNo: pNum })}
                                                className="border border-gray-300 p-2 cursor-pointer hover:bg-blue-50 text-sm h-24 align-top"
                                            >
                                                {period ? (
                                                    <div>
                                                        <div className="font-bold text-blue-600">{period.subject}</div>
                                                        <div className="text-xs text-gray-400">{teachers.find(t => t._id === period.teacher)?.name || 'Unknown Teacher'}</div>
                                                        <div className="text-xs">{period.startTime} - {period.endTime}</div>
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-300 text-center mt-4">+</div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {editingCell && (
                <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded shadow-xl w-96">
                        <h3 className="font-bold mb-4">Edit Period {cellData.periodNo}</h3>

                        <label className="block text-sm">Subject</label>
                        <input type="text" value={cellData.subject} onChange={e => setCellData({ ...cellData, subject: e.target.value })} className="w-full border p-2 mb-2 rounded" />

                        <label className="block text-sm">Teacher</label>
                        <select value={cellData.teacher} onChange={e => setCellData({ ...cellData, teacher: e.target.value })} className="w-full border p-2 mb-2 rounded">
                            <option value="">Select Teacher</option>
                            {teachers.map(t => (
                                <option key={t._id} value={t._id}>{t.name}</option>
                            ))}
                        </select>

                        <div className="flex gap-2 mb-2">
                            <div className="w-1/2">
                                <label className="block text-sm">Start Time</label>
                                <input type="time" value={cellData.startTime} onChange={e => setCellData({ ...cellData, startTime: e.target.value })} className="w-full border p-2 rounded" />
                            </div>
                            <div className="w-1/2">
                                <label className="block text-sm">End Time</label>
                                <input type="time" value={cellData.endTime} onChange={e => setCellData({ ...cellData, endTime: e.target.value })} className="w-full border p-2 rounded" />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setEditingCell(null)} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                            <button onClick={handleSaveCell} className="px-4 py-2 bg-blue-600 text-white rounded">Update</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimetableEditor;
