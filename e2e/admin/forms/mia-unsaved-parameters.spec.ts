import { test, expect } from '../fixtures';
import {
  control,
  gotoCreateForm,
  saveAndCaptureId,
  selectAutocompleteOption,
  selectFirstMatOption,
  uniqueValue,
} from '../helpers/form';
import {
  addChildMapping,
  addMiaParameterRow,
  CARTOGRAPHY_OPTION,
  CARTOGRAPHY_SEARCH,
  createMiaWithChild,
  expectChildTaskMapping,
  includedOwner,
  MIA_CREATE_PATH,
  openMia,
  saveMiaUpdate,
} from '../helpers/mia-form';

const SEEDED_QUERY_CHILD_ID = 10038;
const CHILD_TASK_SEARCH = 'Web API direct';
const CHILD_TASK_OPTION = /Web API direct \(template param\)/;
const CHILD_PARAM_LABEL = 'codigo';

test.describe('MIA parameters mapped before saving', () => {
  test('an existing MIA maps a parameter added since the last save (#373)', async ({
    page,
    request,
    createdResources,
  }) => {
    test.setTimeout(120_000);
    const { id } = await createMiaWithChild(page, {
      childSearch: CHILD_TASK_SEARCH,
      childOption: CHILD_TASK_OPTION,
      childId: SEEDED_QUERY_CHILD_ID,
    });
    createdResources.push({ collection: 'tasks', id });
    await openMia(page, id);

    const label = uniqueValue('e2e-373-param');
    const value = uniqueValue('feature');
    await addMiaParameterRow(page, { label, value });
    await addChildMapping(page, {
      owner: includedOwner(SEEDED_QUERY_CHILD_ID),
      miaParamLabel: label,
      childParamLabel: CHILD_PARAM_LABEL,
    });
    await saveMiaUpdate(page, id);

    await expectChildTaskMapping(request, id, SEEDED_QUERY_CHILD_ID, { [CHILD_PARAM_LABEL]: value });
  });

  test('a new MIA maps its parameters before the first save (#373)', async ({
    page,
    request,
    createdResources,
  }) => {
    test.setTimeout(120_000);
    await gotoCreateForm(page, MIA_CREATE_PATH, 'name');
    await control(page, 'name').fill(uniqueValue('e2e-373-mia'));
    await selectFirstMatOption(page, 'taskGroupId');
    await selectAutocompleteOption(
      page,
      page.getByRole('combobox', {
        name: /Cartography used|Cartografia utilitzada|Cartografía utilizada|Cartographie utilisée/i,
      }),
      CARTOGRAPHY_SEARCH,
      CARTOGRAPHY_OPTION,
    );
    await control(page, 'parentLayout').click();
    await page.getByRole('option', { name: /^(Tabs|Pestanyes|Pestañas|Onglets|Pestanhes)$/i }).click();
    await selectAutocompleteOption(
      page,
      page.getByRole('combobox', { name: /Add task|Afegir tasca|Añadir tarea|Ajouter une tâche/i }),
      CHILD_TASK_SEARCH,
      CHILD_TASK_OPTION,
    );
    await expect(page.locator('.included-task-id')).toContainText(`ID: ${SEEDED_QUERY_CHILD_ID}`);

    const label = uniqueValue('e2e-373-param');
    const value = uniqueValue('feature');
    await addMiaParameterRow(page, { label, value });
    await addChildMapping(page, {
      owner: includedOwner(SEEDED_QUERY_CHILD_ID),
      miaParamLabel: label,
      childParamLabel: CHILD_PARAM_LABEL,
    });
    const id = await saveAndCaptureId(page, 'tasks');
    createdResources.push({ collection: 'tasks', id });

    await expectChildTaskMapping(request, id, SEEDED_QUERY_CHILD_ID, { [CHILD_PARAM_LABEL]: value });
  });
});
