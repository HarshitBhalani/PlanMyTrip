"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // Load todos from localStorage
  useEffect(() => {
    const savedTodos = localStorage.getItem("tripTodos");
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos));
    }
  }, []);

  // Save todos to localStorage
  useEffect(() => {
    localStorage.setItem("tripTodos", JSON.stringify(todos));
  }, [todos]);

  const addTodo = () => {
    if (!newTodo.trim()) {
      toast.error("Please enter a task");
      return;
    }

    const todo: Todo = {
      id: Date.now().toString(),
      text: newTodo.trim(),
      completed: false,
      createdAt: Date.now(),
    };

    setTodos([todo, ...todos]);
    setNewTodo("");
    toast.success("Task added!");
  };

  const toggleTodo = (id: string) => {
    setTodos(
      todos.map((todo) =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
    toast.success("Task deleted");
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-[#1F2937] text-white p-4 rounded-full shadow-lg hover:bg-gray-700 z-40 flex items-center gap-2"
      >
        <span className="text-2xl">📝</span>
        <span className="font-medium hidden sm:inline">My Tasks</span>
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-lg w-full max-w-md max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-800">📝 My Tasks</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-2xl text-gray-600 hover:text-gray-800"
              >
                ✕
              </button>
            </div>

            {/* Add Todo */}
            <div className="p-5 border-b">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && addTodo()}
                  placeholder="Add a new task..."
                  className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:border-[#1F2937]"
                />
                <button
                  onClick={addTodo}
                  className="px-5 py-2 bg-[#1F2937] text-white rounded-lg hover:bg-gray-700 font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Todo List */}
            <div className="flex-1 overflow-y-auto p-5">
              {todos.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <div className="text-5xl mb-3">✅</div>
                  <p>No tasks yet. Add one above!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {todos.map((todo) => (
                    <div
                      key={todo.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        todo.completed
                          ? "bg-gray-50 border-gray-200"
                          : "bg-white border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={todo.completed}
                        onChange={() => toggleTodo(todo.id)}
                        className="mt-1 w-5 h-5 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p
                          className={`${
                            todo.completed
                              ? "line-through text-gray-500"
                              : "text-gray-800"
                          }`}
                        >
                          {todo.text}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="text-red-500 hover:text-red-700 text-xl"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Stats */}
            {todos.length > 0 && (
              <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total: {todos.length}</span>
                  <span>
                    Completed: {todos.filter((t) => t.completed).length}
                  </span>
                  <span>
                    Pending: {todos.filter((t) => !t.completed).length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}