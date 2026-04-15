# Turing Machine Visualizer

A browser-based simulator to visualize the execution of a Turing Machine with:
- tape visualization
- read/write head movement
- configurable transition rules
- step-by-step computation log

## Run

Open `index.html` directly in a browser.

If your browser blocks local assets, run a simple local server from this folder:

```bash
python3 -m http.server 8080
```

Then open:

`http://localhost:8080`

## How to Use

1. Enter machine configuration:
   - Initial state
   - Accept and reject states
   - Blank symbol
   - Input string
2. Add transition rules manually or click **Load Sample Rules**.
3. Click **Initialize Machine**.
4. Use:
   - **Step** to execute one transition
   - **Run** to execute continuously
   - **Pause** to stop execution
   - **Reset** to reset to the initial tape and state
5. Observe:
   - highlighted tape cell under the head
   - modified tape symbols
   - state/head/step counters
   - transition log entries

## Sample Rules Included

The default sample increments a binary number by 1.
Input `1011` should halt in an accept state with tape content representing `1100`.

## Notes

- Moves supported: `L`, `R`
- Input string can use any symbols (including alphabets), as long as matching transition rules are defined.
- You can use `*` in the read field as a wildcard for a state.
- If no transition is found, the machine halts.
